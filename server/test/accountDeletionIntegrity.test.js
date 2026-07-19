const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const prismaPath = require.resolve('../dist/prisma');
const userControllerPath = require.resolve('../dist/controllers/userController');
const authControllerPath = require.resolve('../dist/controllers/authController');
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

test('the trust-and-safety migration is atomic', () => {
  const migration = fs.readFileSync(
    path.resolve(__dirname, '../prisma/migrations/20260718180000_add_content_moderation/migration.sql'),
    'utf8'
  ).trim();
  assert.match(migration, /^BEGIN;/);
  assert.match(migration, /COMMIT;$/);
});

test('generic account deletion refuses another administrative account', async () => {
  let mutated = false;
  const tx = {
    user: {
      findUnique: async () => ({
        id: 'admin-target',
        email: 'target@example.com',
        name: 'Target',
        role: 'admin',
        moderationStatus: 'ACTIVE',
        deletedAt: null,
        deletionIdentityDigest: null,
        technician: null,
      }),
      update: async () => { mutated = true; },
    },
  };
  mockPrisma({ $transaction: async (task) => task(tx) });
  delete require.cache[userControllerPath];

  const { deleteUser } = require(userControllerPath);
  const response = responseRecorder();
  await deleteUser({
    params: { id: 'admin-target' },
    auth: { userId: 'admin-actor', role: 'admin' },
  }, response);

  assert.equal(response.statusCode, 403);
  assert.match(response.body.message, /administrativa/i);
  assert.equal(mutated, false);
});

test('the last live administrator cannot self-delete', async () => {
  let mutated = false;
  const tx = {
    user: {
      findUnique: async () => ({
        id: 'last-admin',
        email: 'last@example.com',
        name: 'Last',
        role: 'admin',
        moderationStatus: 'ACTIVE',
        deletedAt: null,
        deletionIdentityDigest: null,
        technician: null,
      }),
      count: async () => 1,
      update: async () => { mutated = true; },
    },
  };
  mockPrisma({ $transaction: async (task) => task(tx) });
  delete require.cache[userControllerPath];

  const { deleteUser } = require(userControllerPath);
  const response = responseRecorder();
  await deleteUser({
    params: { id: 'last-admin' },
    auth: { userId: 'last-admin', role: 'admin' },
  }, response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /última cuenta administrativa/i);
  assert.equal(mutated, false);
});

test('account deletion anonymizes the account but retains immutable report evidence and a sanction marker', async () => {
  const reportUpdates = [];
  const userUpdates = [];
  const noopDeleteMany = async () => ({ count: 0 });
  const tx = {
    user: {
      findUnique: async () => ({
        id: 'reported-user',
        email: 'Reported.User@example.com',
        name: 'Reported User',
        role: 'user',
        moderationStatus: 'SUSPENDED',
        deletedAt: null,
        deletionIdentityDigest: null,
        technician: null,
      }),
      update: async (options) => {
        userUpdates.push(options);
        return { id: options.where.id };
      },
    },
    contentReport: {
      findMany: async () => [{
        id: 'report-1',
        reporterIdentitySnapshot: null,
        targetIdentitySnapshot: null,
        technicianIdSnapshot: null,
        profilePhotoIdSnapshot: null,
        technicianId: null,
        profilePhotoSubmissionId: null,
        reporter: {
          id: 'reporter-user',
          email: 'reporter@example.com',
          name: 'Reporter',
          role: 'user',
          deletedAt: null,
          deletionIdentityDigest: null,
        },
        targetUser: {
          id: 'reported-user',
          email: 'Reported.User@example.com',
          name: 'Reported User',
          role: 'user',
          deletedAt: null,
          deletionIdentityDigest: null,
        },
      }],
      update: async (options) => {
        reportUpdates.push(options);
        return { id: options.where.id };
      },
    },
    booking: { findMany: async () => [], deleteMany: noopDeleteMany },
    bookingReminder: { deleteMany: noopDeleteMany },
    userPoints: { deleteMany: noopDeleteMany },
    pointTransaction: { deleteMany: noopDeleteMany },
    userAchievement: { deleteMany: noopDeleteMany },
    rewardRedemption: { deleteMany: noopDeleteMany },
    leaderboardEntry: { deleteMany: noopDeleteMany },
    profileChangeHistory: { deleteMany: noopDeleteMany },
    ugcTermsConsent: { deleteMany: noopDeleteMany },
    userBlock: { deleteMany: noopDeleteMany },
    profilePhotoSubmission: { deleteMany: noopDeleteMany },
    review: { deleteMany: noopDeleteMany },
  };
  mockPrisma({ $transaction: async (task) => task(tx) });
  delete require.cache[userControllerPath];

  const { deleteUser } = require(userControllerPath);
  const response = responseRecorder();
  await deleteUser({
    params: { id: 'reported-user' },
    auth: { userId: 'reported-user', role: 'user', accountSuspended: true },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(reportUpdates.length, 1);
  assert.equal(reportUpdates[0].where.id, 'report-1');
  assert.equal(reportUpdates[0].data.targetIdentitySnapshot.displayName, 'Reported User');
  assert.equal(reportUpdates[0].data.targetIdentitySnapshot.identityDigest.length, 64);
  assert.equal(JSON.stringify(reportUpdates[0].data).includes('Reported.User@example.com'), false);

  assert.equal(userUpdates.length, 1);
  const tombstone = userUpdates[0].data;
  assert.equal(tombstone.email, 'deleted+reported-user@accounts.invalid');
  assert.equal(tombstone.name, 'Cuenta eliminada');
  assert.equal(tombstone.phone, null);
  assert.equal(tombstone.photoUrl, null);
  assert.equal(tombstone.sanctionedAtDeletion, true);
  assert.equal(tombstone.deletionIdentityDigest.length, 64);
  assert.ok(tombstone.deletedAt instanceof Date);
});

test('registration blocks a sanctioned deletion marker without recreating the account', async () => {
  let transactionStarted = false;
  mockPrisma({
    user: {
      findFirst: async (options) => (
        options.where.deletionIdentityDigest ? { id: 'deleted-marker' } : null
      ),
    },
    $transaction: async () => {
      transactionStarted = true;
    },
  });
  delete require.cache[authControllerPath];

  const { register } = require(authControllerPath);
  const response = responseRecorder();
  await register({
    body: {
      name: 'Nueva cuenta',
      email: 'reported.user@example.com',
      password: 'valid-password',
      accountType: 'user',
      ugcTermsAccepted: true,
      ugcTermsVersion: '2026-07-18',
    },
    headers: {},
    ip: '127.0.0.1',
  }, response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'ACCOUNT_RECREATION_RESTRICTED');
  assert.equal(transactionStarted, false);
});

test('a pre-deletion bearer token cannot authenticate a tombstoned account', async () => {
  mockPrisma({
    user: {
      findUnique: async () => ({
        id: 'deleted-user',
        role: 'user',
        moderationStatus: 'ACTIVE',
        moderationReason: null,
        deletedAt: new Date(),
      }),
    },
  });
  delete require.cache[authMiddlewarePath];

  const { createAuthToken } = require('../dist/security/token');
  const { requireAuth } = require(authMiddlewarePath);
  const response = responseRecorder();
  let nextCalled = false;
  await requireAuth({
    headers: { authorization: `Bearer ${createAuthToken('deleted-user', 'user')}` },
  }, response, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});
