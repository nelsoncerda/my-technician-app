const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const prismaPath = require.resolve('../dist/prisma');
const moderationControllerPath = require.resolve('../dist/controllers/moderationController');
const authControllerPath = require.resolve('../dist/controllers/authController');
const technicianControllerPath = require.resolve('../dist/controllers/technicianController');
const bookingServicePath = require.resolve('../dist/services/bookingService');
const authMiddlewarePath = require.resolve('../dist/middleware/auth');

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
  };
}

function mockPrisma(value) {
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { __esModule: true, default: value },
  };
}

test('registration contract requires current consent and stages photos instead of publishing them', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../src/controllers/authController.ts'),
    'utf8'
  );
  assert.match(source, /if \(!acceptsCurrentTerms\)/);
  assert.match(source, /photoUrl: null/);
  assert.match(source, /profilePhotoSubmission\.create/);
  assert.match(source, /moderationStatus: 'PENDING'/);
  assert.match(source, /recordCurrentTermsConsent/);
});

test('login returns the latest photo decision, including a rejection reason, without the image or reviewer', async () => {
  const { hashPassword } = require('../dist/security/password');
  let loginSelect;
  mockPrisma({
    user: {
      findFirst: async (options) => {
        loginSelect = options.select;
        return {
          id: 'owner-1',
          name: 'Photo Owner',
          email: 'owner@example.com',
          password: await hashPassword('correct-password'),
          role: 'user',
          phone: null,
          photoUrl: 'approved-photo-url',
          emailVerified: true,
          moderationStatus: 'ACTIVE',
          moderationReason: null,
          technician: null,
          ugcTermsConsents: [],
          profilePhotoSubmissions: [{
            id: 'photo-latest',
            status: 'REJECTED',
            submittedAt: new Date('2026-07-18T12:00:00Z'),
            reviewedAt: new Date('2026-07-18T13:00:00Z'),
            reviewNote: 'La imagen no muestra claramente a la persona.',
          }],
        };
      },
    },
  });
  delete require.cache[authControllerPath];
  const { login } = require(authControllerPath);
  const response = responseRecorder();

  await login({ body: { email: 'owner@example.com', password: 'correct-password' } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(loginSelect.profilePhotoSubmissions.where, undefined);
  assert.deepEqual(loginSelect.profilePhotoSubmissions.orderBy, { submittedAt: 'desc' });
  assert.equal(response.body.photoModerationStatus, 'REJECTED');
  assert.equal(response.body.photoModerationReason, 'La imagen no muestra claramente a la persona.');
  assert.equal(response.body.photoModerationSubmissionId, 'photo-latest');
  assert.equal(response.body.pendingPhotoSubmissionId, null);
  assert.equal('imageData' in response.body, false);
  assert.equal('reviewedById' in response.body, false);
});

test('owner status response includes the latest safe photo review fields', async () => {
  let statusSelect;
  mockPrisma({
    user: {
      findUnique: async (options) => {
        statusSelect = options.select;
        return {
          emailVerified: true,
          moderationStatus: 'ACTIVE',
          moderationReason: null,
          technician: null,
          profilePhotoSubmissions: [{
            id: 'photo-status',
            status: 'REJECTED',
            submittedAt: new Date('2026-07-18T12:00:00Z'),
            reviewedAt: new Date('2026-07-18T13:00:00Z'),
            reviewNote: 'Usa una fotografía de perfil apropiada.',
          }],
        };
      },
    },
  });
  delete require.cache[authControllerPath];
  const { checkVerificationStatus } = require(authControllerPath);
  const response = responseRecorder();

  await checkVerificationStatus({ auth: { userId: 'owner-1', role: 'user' } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(statusSelect.profilePhotoSubmissions.select.imageData, undefined);
  assert.equal(statusSelect.profilePhotoSubmissions.select.reviewedById, undefined);
  assert.equal(response.body.photoModerationStatus, 'REJECTED');
  assert.equal(response.body.photoModerationReason, 'Usa una fotografía de perfil apropiada.');
});

test('public identity filter catches simple evasion without blocking legitimate substrings', () => {
  const { containsObjectionablePublicText } = require('../dist/utils/contentModeration');
  assert.equal(containsObjectionablePublicText('p.u.t.a'), true);
  assert.equal(containsObjectionablePublicText('P0RN0'), true);
  assert.equal(containsObjectionablePublicText('Reparación de computadoras'), false);
});

test('directory requests only approved profiles and hides either side of a block', async () => {
  let technicianQuery;
  mockPrisma({
    userBlock: {
      findMany: async () => [{ blockerId: 'viewer', blockedUserId: 'hidden-user' }],
    },
    technician: {
      findMany: async (options) => {
        technicianQuery = options;
        return [{
          id: 'tech-visible',
          userId: 'visible-user',
          user: { name: 'Visible', photoUrl: null },
          specializations: ['Plomería'],
          location: 'Santiago',
          companyName: null,
          rating: 4,
          verified: true,
          mapVisible: false,
          serviceAreaLatitude: null,
          serviceAreaLongitude: null,
          serviceAreaRadiusKm: 5,
          _count: { reviews: 2 },
        }];
      },
    },
  });
  delete require.cache[technicianControllerPath];
  const { getTechnicians } = require(technicianControllerPath);
  const response = responseRecorder();

  await getTechnicians({ auth: { userId: 'viewer', role: 'user' }, query: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(technicianQuery.where.moderationStatus, 'APPROVED');
  assert.deepEqual(technicianQuery.where.user, { moderationStatus: 'ACTIVE' });
  assert.deepEqual(technicianQuery.where.userId.notIn, ['hidden-user']);
  assert.equal(response.body[0].userId, 'visible-user');
  assert.equal('reviews' in response.body[0], false);
});

test('new bookings reject a non-approved technician before checking availability', async () => {
  let availabilityRead = false;
  const transactionClient = {
    technician: {
      findUnique: async () => ({
        userId: 'tech-user', moderationStatus: 'SUSPENDED', user: { moderationStatus: 'ACTIVE' },
      }),
    },
    user: { findUnique: async () => ({ moderationStatus: 'ACTIVE' }) },
    availabilitySlot: {
      count: async () => {
        availabilityRead = true;
        return 0;
      },
    },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[bookingServicePath];
  const service = require(bookingServicePath);

  await assert.rejects(
    service.createBooking({
      customerId: 'customer',
      technicianId: 'tech',
      scheduledDate: new Date('2026-08-01T00:00:00Z'),
      scheduledTime: '10:00',
      serviceType: 'Plomería',
      address: 'Calle 1',
      city: 'Santiago',
      phone: '8095550000',
    }),
    /no está disponible/i
  );
  assert.equal(availabilityRead, false);
});

test('public slot lookup also requires an active technician account', async () => {
  let technicianWhere;
  mockPrisma({
    technician: {
      findFirst: async (options) => {
        technicianWhere = options.where;
        return null;
      },
    },
  });
  delete require.cache[bookingServicePath];
  const service = require(bookingServicePath);
  const slots = await service.getAvailableSlots('tech-1', new Date('2026-08-01T00:00:00Z'));
  assert.deepEqual(slots, []);
  assert.deepEqual(technicianWhere, {
    id: 'tech-1',
    moderationStatus: 'APPROVED',
    user: { moderationStatus: 'ACTIVE' },
  });
});

test('new bookings reject a block in either direction', async () => {
  let bookingCreated = false;
  const transactionClient = {
    technician: {
      findUnique: async () => ({
        userId: 'tech-user', moderationStatus: 'APPROVED', user: { moderationStatus: 'ACTIVE' },
      }),
    },
    user: { findUnique: async () => ({ moderationStatus: 'ACTIVE' }) },
    userBlock: { findFirst: async () => ({ id: 'block-1' }) },
    booking: { create: async () => { bookingCreated = true; } },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[bookingServicePath];
  const service = require(bookingServicePath);

  await assert.rejects(
    service.createBooking({
      customerId: 'customer',
      technicianId: 'tech',
      scheduledDate: new Date('2026-08-01T00:00:00Z'),
      scheduledTime: '10:00',
      serviceType: 'Plomería',
      address: 'Calle 1',
      city: 'Santiago',
      phone: '8095550000',
    }),
    /No puedes reservar/i
  );
  assert.equal(bookingCreated, false);
});

test('booking reads redact contact channels for blocks in either direction', async () => {
  let blockQuery;
  mockPrisma({
    booking: {
      findMany: async () => [
        {
          id: 'booking-blocked-by-technician',
          customerId: 'customer',
          phone: '809-555-0001',
          technician: {
            id: 'tech-1',
            userId: 'tech-user-1',
            user: {
              id: 'tech-user-1',
              name: 'Técnico Uno',
              email: 'tech-one@example.com',
              phone: '809-555-1001',
            },
          },
        },
        {
          id: 'booking-blocked-by-customer',
          customerId: 'customer',
          phone: '809-555-0002',
          technician: {
            id: 'tech-2',
            userId: 'tech-user-2',
            user: {
              id: 'tech-user-2',
              name: 'Técnico Dos',
              email: 'tech-two@example.com',
              phone: '809-555-1002',
            },
          },
        },
        {
          id: 'booking-unblocked',
          customerId: 'customer',
          phone: '809-555-0003',
          technician: {
            id: 'tech-3',
            userId: 'tech-user-3',
            user: {
              id: 'tech-user-3',
              name: 'Técnico Tres',
              email: 'tech-three@example.com',
              phone: '809-555-1003',
            },
          },
        },
      ],
    },
    userBlock: {
      findMany: async (options) => {
        blockQuery = options;
        return [
          { blockerId: 'tech-user-1', blockedUserId: 'customer' },
          { blockerId: 'customer', blockedUserId: 'tech-user-2' },
        ];
      },
    },
  });
  delete require.cache[bookingServicePath];
  const service = require(bookingServicePath);

  const bookings = await service.getCustomerBookings('customer');

  assert.deepEqual(
    new Set(blockQuery.where.blockerId.in),
    new Set(['customer', 'tech-user-1', 'tech-user-2', 'tech-user-3'])
  );
  for (const booking of bookings.slice(0, 2)) {
    assert.equal(booking.interactionBlocked, true);
    assert.equal('phone' in booking, false);
    assert.equal('email' in booking.technician.user, false);
    assert.equal('phone' in booking.technician.user, false);
    assert.match(booking.technician.user.name, /^Técnico/);
  }
  assert.equal(bookings[2].interactionBlocked, false);
  assert.equal(bookings[2].phone, '809-555-0003');
  assert.equal(bookings[2].technician.user.email, 'tech-three@example.com');
  assert.equal(bookings[2].technician.user.phone, '809-555-1003');
});

test('blocked booking detail retains dispute facts but strips both participants contact data', async () => {
  mockPrisma({
    booking: {
      findUnique: async () => ({
        id: 'booking-detail',
        customerId: 'customer',
        serviceType: 'Plomería',
        address: 'Calle histórica 10',
        city: 'Santiago',
        phone: '809-555-0001',
        customer: {
          id: 'customer',
          name: 'Cliente',
          email: 'customer@example.com',
          phone: '809-555-0002',
        },
        technician: {
          id: 'tech-1',
          userId: 'tech-user',
          user: {
            id: 'tech-user',
            name: 'Técnico',
            email: 'technician@example.com',
            phone: '809-555-0003',
          },
        },
      }),
    },
    userBlock: {
      findMany: async () => [{ blockerId: 'tech-user', blockedUserId: 'customer' }],
    },
  });
  delete require.cache[bookingServicePath];
  const service = require(bookingServicePath);

  const booking = await service.getBookingById('booking-detail');

  assert.equal(booking.interactionBlocked, true);
  assert.equal(booking.serviceType, 'Plomería');
  assert.equal(booking.address, 'Calle histórica 10');
  assert.equal(booking.city, 'Santiago');
  assert.equal('phone' in booking, false);
  assert.deepEqual(booking.customer, { id: 'customer', name: 'Cliente' });
  assert.deepEqual(booking.technician.user, { id: 'tech-user', name: 'Técnico' });
});

test('an existing blocked booking cannot be confirmed but remains available for cancellation', async () => {
  let updateCalled = false;
  mockPrisma({
    booking: {
      findUnique: async () => ({
        id: 'booking-1',
        customerId: 'customer',
        technicianId: 'tech-1',
        status: 'PENDING',
        createdAt: new Date(),
        technician: { userId: 'tech-user' },
      }),
      update: async () => { updateCalled = true; },
    },
    userBlock: { findFirst: async () => ({ id: 'block-1' }) },
    user: { findUnique: async () => ({ moderationStatus: 'ACTIVE' }) },
    technician: {
      findUnique: async () => ({
        userId: 'tech-user',
        moderationStatus: 'APPROVED',
        user: { moderationStatus: 'ACTIVE' },
      }),
    },
  });
  delete require.cache[bookingServicePath];
  const service = require(bookingServicePath);
  await assert.rejects(
    service.confirmBooking('booking-1', { userId: 'tech-user', role: 'technician' }),
    /bloqueó al otro/i
  );
  assert.equal(updateCalled, false);
  await service.cancelBooking(
    'booking-1',
    { userId: 'customer', role: 'user' },
    'Prefiero no continuar'
  );
  assert.equal(updateCalled, true);
});

test('existing booking lifecycle cannot bypass a technician suspension', async () => {
  let updateCalled = false;
  mockPrisma({
    booking: {
      findUnique: async () => ({
        id: 'booking-2',
        customerId: 'customer',
        technicianId: 'tech-1',
        status: 'CONFIRMED',
        technician: { userId: 'tech-user' },
      }),
      update: async () => { updateCalled = true; },
    },
    userBlock: { findFirst: async () => null },
    user: { findUnique: async () => ({ moderationStatus: 'ACTIVE' }) },
    technician: {
      findUnique: async () => ({
        userId: 'tech-user',
        moderationStatus: 'SUSPENDED',
        user: { moderationStatus: 'ACTIVE' },
      }),
    },
  });
  delete require.cache[bookingServicePath];
  const service = require(bookingServicePath);
  await assert.rejects(
    service.startBooking('booking-2', { userId: 'tech-user', role: 'technician' }),
    /no está aprobado y activo/i
  );
  assert.equal(updateCalled, false);
});

test('reports reject self-reporting and technician IDOR', async () => {
  mockPrisma({});
  delete require.cache[moderationControllerPath];
  let controller = require(moderationControllerPath);
  let response = responseRecorder();
  await controller.createReport({
    auth: { userId: 'same-user', role: 'user' },
    body: { targetUserId: 'same-user', contentType: 'BEHAVIOR', reason: 'HARASSMENT' },
  }, response);
  assert.equal(response.statusCode, 400);

  mockPrisma({
    $transaction: async (task) => task({
      user: {
        findUnique: async () => ({
          id: 'target-user',
          photoUrl: null,
          technician: { id: 'actual-tech' },
        }),
      },
    }),
  });
  delete require.cache[moderationControllerPath];
  controller = require(moderationControllerPath);
  response = responseRecorder();
  await controller.createReport({
    auth: { userId: 'reporter', role: 'user' },
    body: {
      targetUserId: 'target-user',
      technicianId: 'someone-elses-tech',
      contentType: 'PROFILE',
      reason: 'FRAUD',
    },
  }, response);
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /no pertenece/i);
});

test('reporter-facing history omits internal resolution notes and reviewer identity', async () => {
  let select;
  mockPrisma({
    contentReport: {
      findMany: async (options) => {
        select = options.select;
        return [];
      },
    },
  });
  delete require.cache[moderationControllerPath];
  const { listOwnReports } = require(moderationControllerPath);
  const response = responseRecorder();
  await listOwnReports({ auth: { userId: 'reporter', role: 'user' } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(select.resolutionNote, undefined);
  assert.equal(select.reviewedBy, undefined);
  assert.equal(select.reviewedById, undefined);
});

test('photo approval publishes once and scrubs the pending review copy', async () => {
  const calls = [];
  const transactionClient = {
    profilePhotoSubmission: {
      findUnique: async () => ({
        id: 'photo-1',
        userId: 'owner',
        imageData: 'data:image/png;base64,AAAA',
        status: 'PENDING',
      }),
      update: async (options) => {
        calls.push(['submission', options.data]);
        return {
          id: 'photo-1',
          userId: 'owner',
          status: options.data.status,
          reviewedAt: options.data.reviewedAt,
          reviewedById: options.data.reviewedById,
          reviewNote: options.data.reviewNote,
        };
      },
      updateMany: async (options) => {
        calls.push(['claim', options.data]);
        return { count: 1 };
      },
    },
    user: {
      findUnique: async () => ({ photoUrl: null }),
      update: async (options) => calls.push(['user', options.data]),
    },
    profileChangeHistory: { create: async () => ({}) },
    moderationAuditLog: { create: async () => ({}) },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[moderationControllerPath];
  const { moderateProfilePhoto } = require(moderationControllerPath);
  const response = responseRecorder();

  await moderateProfilePhoto({
    auth: { userId: 'admin', role: 'admin' },
    params: { id: 'photo-1' },
    body: { decision: 'APPROVE', reason: 'Foto apropiada' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(calls[0][0], 'claim');
  assert.equal(calls[0][1].pendingKey, null);
  assert.equal(calls[0][1].status, 'APPROVED');
  assert.deepEqual(calls[1], ['user', { photoUrl: 'data:image/png;base64,AAAA' }]);
  assert.deepEqual(calls[2], ['submission', { imageData: '' }]);
});

test('photo rejection never publishes and also scrubs the review copy', async () => {
  let userUpdated = false;
  let submissionData;
  const transactionClient = {
    profilePhotoSubmission: {
      findUnique: async () => ({
        id: 'photo-2', userId: 'owner', imageData: 'secret-image', status: 'PENDING',
      }),
      update: async (options) => {
        submissionData = { ...submissionData, ...options.data };
        return { id: 'photo-2', userId: 'owner', ...options.data };
      },
      updateMany: async (options) => {
        submissionData = options.data;
        return { count: 1 };
      },
    },
    user: { update: async () => { userUpdated = true; } },
    moderationAuditLog: { create: async () => ({}) },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[moderationControllerPath];
  const { moderateProfilePhoto } = require(moderationControllerPath);
  const response = responseRecorder();
  await moderateProfilePhoto({
    auth: { userId: 'admin', role: 'admin' },
    params: { id: 'photo-2' },
    body: { decision: 'REJECT', reason: 'No corresponde a una persona' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(userUpdated, false);
  assert.equal(submissionData.imageData, '');
  assert.equal(submissionData.status, 'REJECTED');
});

test('admin-only moderation guard rejects regular users', () => {
  const { requireAdmin } = require('../dist/middleware/auth');
  const response = responseRecorder();
  let continued = false;
  requireAdmin(
    { auth: { userId: 'user', role: 'user' } },
    response,
    () => { continued = true; }
  );
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);
});

test('suspended accounts are blocked from normal APIs but retain self-service deletion authentication', async () => {
  const { createAuthToken } = require('../dist/security/token');
  mockPrisma({
    user: {
      findUnique: async () => ({
        id: 'suspended-user',
        role: 'user',
        moderationStatus: 'SUSPENDED',
        moderationReason: 'Incumplimiento de las normas.',
      }),
    },
  });
  delete require.cache[authMiddlewarePath];
  const {
    requireAuth,
    requireAuthAllowSuspended,
    requireSelfOrActiveAdmin,
  } = require(authMiddlewarePath);
  const request = {
    headers: { authorization: `Bearer ${createAuthToken('suspended-user', 'user')}` },
  };
  let response = responseRecorder();
  let continued = false;
  await requireAuth(request, response, () => { continued = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'ACCOUNT_SUSPENDED');
  assert.equal(response.body.accountModerationReason, 'Incumplimiento de las normas.');
  assert.equal(response.body.limitedAccess, true);
  assert.equal(continued, false);

  response = responseRecorder();
  await requireAuthAllowSuspended(request, response, () => { continued = true; });
  assert.equal(response.statusCode, 200);
  assert.equal(continued, true);
  assert.equal(request.auth.userId, 'suspended-user');

  response = responseRecorder();
  continued = false;
  requireSelfOrActiveAdmin('id')(
    {
      auth: { userId: 'suspended-admin', role: 'admin', accountSuspended: true },
      params: { id: 'another-user' },
    },
    response,
    () => { continued = true; }
  );
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);
});

test('admin can restore a suspended non-admin account and the transition is audited', async () => {
  let updateData;
  let auditData;
  const transactionClient = {
    currentStatus: 'SUSPENDED',
    user: {
      findUnique: async () => ({
        id: 'target',
        name: 'Target',
        email: 'target@example.com',
        role: 'user',
        moderationStatus: transactionClient.currentStatus,
        moderationReason: transactionClient.currentStatus === 'SUSPENDED' ? 'Original reason' : null,
        moderatedAt: null,
      }),
      updateMany: async (options) => {
        updateData = options.data;
        transactionClient.currentStatus = options.data.moderationStatus;
        return { count: 1 };
      },
    },
    moderationAuditLog: {
      create: async (options) => {
        auditData = options.data;
        return {};
      },
    },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[moderationControllerPath];
  const { moderateUser } = require(moderationControllerPath);
  const response = responseRecorder();
  await moderateUser({
    auth: { userId: 'admin', role: 'admin' },
    params: { id: 'target' },
    body: { decision: 'RESTORE', reason: 'Apelación aceptada' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(updateData.moderationStatus, 'ACTIVE');
  assert.equal(updateData.moderationReason, null);
  assert.equal(auditData.action, 'USER_RESTORE');
  assert.equal(auditData.fromStatus, 'SUSPENDED');
  assert.equal(auditData.toStatus, 'ACTIVE');
});

test('admin restoration lifts a deleted sanction marker after appeal', async () => {
  let status = 'SUSPENDED';
  let updateWhere;
  const deletedAt = new Date('2026-07-18T12:00:00Z');
  const transactionClient = {
    user: {
      findUnique: async () => ({
        id: 'deleted-target',
        name: 'Cuenta eliminada',
        email: 'deleted+deleted-target@accounts.invalid',
        role: 'user',
        moderationStatus: status,
        moderationReason: status === 'SUSPENDED' ? 'Marcador activo' : null,
        moderatedAt: null,
        deletedAt,
      }),
      updateMany: async (options) => {
        updateWhere = options.where;
        status = options.data.moderationStatus;
        return { count: 1 };
      },
    },
    moderationAuditLog: { create: async () => ({}) },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[moderationControllerPath];
  const { moderateUser } = require(moderationControllerPath);
  const response = responseRecorder();

  await moderateUser({
    auth: { userId: 'admin', role: 'admin' },
    params: { id: 'deleted-target' },
    body: { decision: 'RESTORE', reason: 'Apelación aceptada' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.accountModerationStatus, 'ACTIVE');
  assert.deepEqual(updateWhere.deletedAt, { not: null });
});

test('an admin can atomically claim an open report for review', async () => {
  let reportStatus = 'OPEN';
  let reviewerId = null;
  let auditData;
  const transactionClient = {
    contentReport: {
      findUnique: async () => ({
        id: 'report-claim',
        status: reportStatus,
        reviewedById: reviewerId,
        updatedAt: new Date('2026-07-18T18:00:00Z'),
      }),
      updateMany: async (options) => {
        assert.deepEqual(options.where, { id: 'report-claim', status: 'OPEN' });
        reportStatus = options.data.status;
        reviewerId = options.data.reviewedById;
        return { count: 1 };
      },
    },
    moderationAuditLog: {
      create: async (options) => {
        auditData = options.data;
        return {};
      },
    },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[moderationControllerPath];
  const { claimReport } = require(moderationControllerPath);
  const response = responseRecorder();

  await claimReport({
    auth: { userId: 'admin-1', role: 'admin' },
    params: { id: 'report-claim' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'UNDER_REVIEW');
  assert.equal(response.body.reviewedById, 'admin-1');
  assert.equal(auditData.action, 'REPORT_CLAIMED');
});

test('a losing report decision returns conflict before applying sanctions', async () => {
  let targetRead = false;
  const transactionClient = {
    contentReport: {
      findUnique: async () => ({
        id: 'report-race',
        targetUserId: 'target',
        technicianId: null,
        contentType: 'BEHAVIOR',
        contentFingerprint: null,
        status: 'OPEN',
        reviewedById: null,
      }),
      updateMany: async () => ({ count: 0 }),
    },
    user: {
      findUnique: async () => {
        targetRead = true;
        return { id: 'target', role: 'user', moderationStatus: 'ACTIVE' };
      },
    },
  };
  mockPrisma({ $transaction: async (task) => task(transactionClient) });
  delete require.cache[moderationControllerPath];
  const { resolveReport } = require(moderationControllerPath);
  const response = responseRecorder();

  await resolveReport({
    auth: { userId: 'admin-2', role: 'admin' },
    params: { id: 'report-race' },
    body: {
      status: 'RESOLVED',
      action: 'USER_SUSPENDED',
      resolutionNote: 'Conducta confirmada',
    },
  }, response);

  assert.equal(response.statusCode, 409);
  assert.equal(targetRead, false);
  assert.match(response.body.message, /cambió mientras lo revisabas/i);
});
