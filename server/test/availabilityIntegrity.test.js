const test = require('node:test');
const assert = require('node:assert/strict');

const prismaPath = require.resolve('../dist/prisma');
const servicePath = require.resolve('../dist/services/bookingService');
const controllerPath = require.resolve('../dist/controllers/bookingController');

function mockPrisma(value) {
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { __esModule: true, default: value },
  };
}

function loadService(prisma) {
  mockPrisma(prisma);
  delete require.cache[servicePath];
  return require(servicePath);
}

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

test('split availability windows are preserved and recreated in one transaction', async () => {
  const calls = [];
  let transactionCalls = 0;
  const transactionClient = {
    availabilitySlot: {
      deleteMany: async (options) => {
        calls.push(['delete', options]);
        return { count: 4 };
      },
      createMany: async (options) => {
        calls.push(['create', options]);
        return { count: options.data.length };
      },
    },
  };
  const service = loadService({
    availabilitySlot: {
      deleteMany: async () => { throw new Error('delete must use the transaction client'); },
      createMany: async () => { throw new Error('create must use the transaction client'); },
    },
    $transaction: async (task) => {
      transactionCalls += 1;
      return task(transactionClient);
    },
  });
  const slots = [
    { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isAvailable: true },
    { dayOfWeek: 1, startTime: '13:00', endTime: '17:00', isAvailable: true },
    { dayOfWeek: 0, startTime: '08:00', endTime: '18:00', isAvailable: false },
  ];

  const result = await service.setAvailability('  tech-1  ', slots);

  assert.deepEqual(result, { count: 3 });
  assert.equal(transactionCalls, 1);
  assert.deepEqual(calls, [
    ['delete', { where: { technicianId: 'tech-1', isRecurring: true } }],
    ['create', {
      data: slots.map((slot) => ({
        technicianId: 'tech-1',
        ...slot,
        isRecurring: true,
      })),
    }],
  ]);
});

test('overlapping windows are rejected before any database mutation', async () => {
  let transactionCalls = 0;
  const service = loadService({
    $transaction: async () => {
      transactionCalls += 1;
      throw new Error('transaction must not start');
    },
  });

  await assert.rejects(
    service.setAvailability('tech-1', [
      { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', isAvailable: true },
      { dayOfWeek: 2, startTime: '11:30', endTime: '15:00', isAvailable: true },
    ]),
    /no pueden solaparse/i
  );
  assert.equal(transactionCalls, 0);
});

test('weekday, time, order, and boolean fields are all validated before mutation', async (t) => {
  let transactionCalls = 0;
  const service = loadService({
    $transaction: async () => {
      transactionCalls += 1;
      throw new Error('transaction must not start');
    },
  });
  const cases = [
    {
      name: 'empty schedule',
      slots: [],
      message: /al menos un horario/i,
    },
    {
      name: 'weekday',
      slot: { dayOfWeek: 7, startTime: '08:00', endTime: '12:00', isAvailable: true },
      message: /entre 0 y 6/i,
    },
    {
      name: 'start time',
      slot: { dayOfWeek: 1, startTime: '8:00', endTime: '12:00', isAvailable: true },
      message: /hora de inicio/i,
    },
    {
      name: 'end time',
      slot: { dayOfWeek: 1, startTime: '08:00', endTime: '24:00', isAvailable: true },
      message: /hora de cierre/i,
    },
    {
      name: 'time order',
      slot: { dayOfWeek: 1, startTime: '12:00', endTime: '08:00', isAvailable: true },
      message: /posterior/i,
    },
    {
      name: 'availability boolean',
      slot: { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isAvailable: 'true' },
      message: /verdadera o falsa/i,
    },
  ];

  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      await assert.rejects(
        service.setAvailability('tech-1', fixture.slots ?? [fixture.slot]),
        fixture.message
      );
    });
  }
  assert.equal(transactionCalls, 0);
});

test('availability controller rejects an invalid request envelope before calling the service', async () => {
  let serviceCalled = false;
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: {
      setAvailability: async () => {
        serviceCalled = true;
      },
    },
  };
  delete require.cache[controllerPath];

  const { setAvailability } = require(controllerPath);
  const response = responseRecorder();
  await setAvailability({ body: { technicianId: 'tech-1', slots: {} } }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'Datos de disponibilidad inválidos');
  assert.equal(serviceCalled, false);
});
