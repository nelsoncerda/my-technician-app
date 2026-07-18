const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getKnownServiceArea,
  normalizeServiceAreaInput,
  ServiceAreaValidationError,
  toPublicMapLocation,
} = require('../dist/utils/serviceArea');

test('provider coordinates are validated and rounded before storage', () => {
  assert.deepEqual(
    normalizeServiceAreaInput({
      latitude: 19.456,
      longitude: -70.696,
      radiusKm: 7.26,
    }),
    { latitude: 19.46, longitude: -70.7, radiusKm: 7.3 }
  );

  assert.throws(
    () => normalizeServiceAreaInput({ latitude: 91, longitude: -70.7 }),
    ServiceAreaValidationError
  );
  assert.throws(
    () => normalizeServiceAreaInput({ latitude: 19.4, longitude: -70.7, radiusKm: 0.5 }),
    /radio debe estar entre 1 y 100/
  );
});

test('known public location labels produce stable, coarse map markers', () => {
  const first = getKnownServiceArea('Santiago Centro', 'tech-123');
  const repeated = getKnownServiceArea('Santiago Centro', 'tech-123');
  const anotherTechnician = getKnownServiceArea('Santiago Centro', 'tech-456');

  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, anotherTechnician);
  assert.ok(Math.abs(first.latitude - 19.4508) < 0.01);
  assert.ok(Math.abs(first.longitude - -70.6947) < 0.01);
  assert.equal(first.radiusKm, 8);
  assert.equal(getKnownServiceArea('Área desconocida', 'tech-123'), null);
  assert.ok(getKnownServiceArea('Puñal, Santiago', 'tech-123'));
});

test('explicit approximate coordinates take precedence and technicians can opt out', () => {
  const source = {
    id: 'tech-1',
    location: 'Tamboril',
    serviceAreaLatitude: 19.4872944,
    serviceAreaLongitude: -70.6125659,
    serviceAreaRadiusKm: 6.04,
    mapVisible: true,
  };

  assert.deepEqual(toPublicMapLocation(source), {
    latitude: 19.49,
    longitude: -70.61,
    radiusKm: 6,
    precision: 'approximate',
  });
  assert.equal(toPublicMapLocation({ ...source, mapVisible: false }), null);
});

test('technicians without coordinates use known service-area labels only', () => {
  const known = toPublicMapLocation({
    id: 'tech-1',
    location: 'Los Jardines',
    mapVisible: true,
  });

  assert.equal(known.precision, 'approximate');
  assert.equal(known.radiusKm, 3);
  assert.equal(toPublicMapLocation({ id: 'tech-2', location: 'Otra provincia' }), null);
});

test('all supported Cibao service-area labels have privacy-safe fallbacks', () => {
  for (const location of [
    'Navarrete',
    'Baitoa',
    'San José de las Matas',
    'Jánico',
    'Sabana Iglesia',
  ]) {
    const marker = toPublicMapLocation({ id: `tech-${location}`, location });
    assert.ok(marker, `Expected a marker for ${location}`);
    assert.equal(marker.precision, 'approximate');
  }
});
