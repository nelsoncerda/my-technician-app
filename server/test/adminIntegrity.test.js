const test = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');

const prismaPath = require.resolve('../dist/prisma');
const technicianControllerPath = require.resolve('../dist/controllers/technicianController');
const userControllerPath = require.resolve('../dist/controllers/userController');

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

test('deleting a technician atomically demotes its account to user', async () => {
  const calls = [];
  const transactionClient = {
    technician: {
      findUnique: async (options) => {
        calls.push(['find', options]);
        return { userId: 'user-1', moderationStatus: 'APPROVED' };
      },
      delete: async (options) => {
        calls.push(['delete', options]);
        return { id: 'tech-1' };
      },
    },
    user: {
      update: async (options) => {
        calls.push(['demote', options]);
        return { id: 'user-1', role: 'user' };
      },
    },
  };

  mockPrisma({
    $transaction: async (task) => task(transactionClient),
  });
  delete require.cache[technicianControllerPath];

  const { deleteTechnician } = require(technicianControllerPath);
  const response = responseRecorder();
  await deleteTechnician({ params: { id: 'tech-1' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    message: 'Perfil técnico eliminado y cuenta convertida en usuario',
    userId: 'user-1',
    role: 'user',
  });
  assert.deepEqual(calls, [
    ['find', { where: { id: 'tech-1' }, select: { userId: true, moderationStatus: true } }],
    ['delete', { where: { id: 'tech-1' } }],
    ['demote', {
      where: { id: 'user-1' },
      data: { role: 'user' },
      select: { id: true, role: true },
    }],
  ]);
});

test('technician deletion preserves constrained history and returns a conflict', async () => {
  const constraintError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint', {
    code: 'P2003',
    clientVersion: '6.19.3',
    meta: { field_name: 'Booking_technicianId_fkey' },
  });

  mockPrisma({
    $transaction: async () => {
      throw constraintError;
    },
  });
  delete require.cache[technicianControllerPath];

  const { deleteTechnician } = require(technicianControllerPath);
  const response = responseRecorder();
  await deleteTechnician({ params: { id: 'tech-1' } }, response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /reservas o reseñas/i);
});

test('technician deletion returns not found without mutating an account', async () => {
  let accountUpdated = false;
  const transactionClient = {
    technician: {
      findUnique: async () => null,
    },
    user: {
      update: async () => {
        accountUpdated = true;
      },
    },
  };

  mockPrisma({
    $transaction: async (task) => task(transactionClient),
  });
  delete require.cache[technicianControllerPath];

  const { deleteTechnician } = require(technicianControllerPath);
  const response = responseRecorder();
  await deleteTechnician({ params: { id: 'missing' } }, response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.message, 'Técnico no encontrado');
  assert.equal(accountUpdated, false);
});

test('a suspended technician cannot be deleted and recreated', async () => {
  let technicianDeleted = false;
  let accountUpdated = false;
  const transactionClient = {
    technician: {
      findUnique: async () => ({ userId: 'user-1', moderationStatus: 'SUSPENDED' }),
      delete: async () => { technicianDeleted = true; },
    },
    user: {
      update: async () => { accountUpdated = true; },
    },
  };

  mockPrisma({
    $transaction: async (task) => task(transactionClient),
  });
  delete require.cache[technicianControllerPath];

  const { deleteTechnician } = require(technicianControllerPath);
  const response = responseRecorder();
  await deleteTechnician({ params: { id: 'tech-1' } }, response);

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.code, 'TECHNICIAN_SUSPENDED');
  assert.equal(technicianDeleted, false);
  assert.equal(accountUpdated, false);
});

test('admin user listing exposes technician linkage without nesting profile data', async () => {
  let select;
  mockPrisma({
    user: {
      findMany: async (options) => {
        select = options.select;
        return [
          {
            id: 'user-1', email: 'one@example.com', name: 'One', role: 'technician',
            moderationStatus: 'ACTIVE', moderationReason: null,
            technician: { id: 'tech-1', moderationStatus: 'SUSPENDED', moderationReason: 'Apelación pendiente' },
          },
          {
            id: 'user-2', email: 'two@example.com', name: 'Two', role: 'user',
            moderationStatus: 'ACTIVE', moderationReason: null, technician: null,
          },
        ];
      },
    },
  });
  delete require.cache[userControllerPath];

  const { getUsers } = require(userControllerPath);
  const response = responseRecorder();
  await getUsers({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(select.technician.select.id, true);
  assert.deepEqual(response.body, [
    {
      id: 'user-1', email: 'one@example.com', name: 'One', role: 'technician',
      accountModerationStatus: 'ACTIVE', accountModerationReason: null, technicianId: 'tech-1',
      technicianModerationStatus: 'SUSPENDED', technicianModerationReason: 'Apelación pendiente',
    },
    {
      id: 'user-2', email: 'two@example.com', name: 'Two', role: 'user',
      accountModerationStatus: 'ACTIVE', accountModerationReason: null, technicianId: undefined,
      technicianModerationStatus: undefined, technicianModerationReason: undefined,
    },
  ]);
  assert.equal('technician' in response.body[0], false);
});
