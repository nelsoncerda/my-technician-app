const test = require('node:test');
const assert = require('node:assert/strict');

const prismaPath = require.resolve('../dist/prisma');
const controllerPath = require.resolve('../dist/controllers/technicianController');

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

test('service-area update stores only rounded coordinates', async () => {
  let updateOptions;
  const update = async (options) => {
    updateOptions = options;
    return {
      id: 'tech-1',
      location: options.data.location,
      mapVisible: options.data.mapVisible,
      serviceAreaLatitude: options.data.serviceAreaLatitude,
      serviceAreaLongitude: options.data.serviceAreaLongitude,
      serviceAreaRadiusKm: options.data.serviceAreaRadiusKm,
    };
  };

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { __esModule: true, default: { technician: { update } } },
  };
  delete require.cache[controllerPath];

  const { updateTechnicianServiceArea } = require(controllerPath);
  const response = responseRecorder();
  await updateTechnicianServiceArea({
    params: { id: 'tech-1' },
    body: {
      location: 'Gurabo',
      mapVisible: true,
      serviceArea: { latitude: 19.4872944, longitude: -70.6616827, radiusKm: 4.04 },
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(updateOptions.data, {
    location: 'Gurabo',
    mapVisible: true,
    serviceAreaLatitude: 19.49,
    serviceAreaLongitude: -70.66,
    serviceAreaRadiusKm: 4,
  });
  assert.deepEqual(response.body.mapLocation, {
    latitude: 19.49,
    longitude: -70.66,
    radiusKm: 4,
    precision: 'approximate',
  });
});

test('service-area update rejects an exact point outside valid ranges', async () => {
  let called = false;
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: {
      __esModule: true,
      default: { technician: { update: async () => { called = true; } } },
    },
  };
  delete require.cache[controllerPath];

  const { updateTechnicianServiceArea } = require(controllerPath);
  const response = responseRecorder();
  await updateTechnicianServiceArea({
    params: { id: 'tech-1' },
    body: { serviceArea: { latitude: 200, longitude: -70.7 } },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /latitud/i);
  assert.equal(called, false);
});
