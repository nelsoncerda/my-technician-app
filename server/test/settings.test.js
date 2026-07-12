const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanSettingValue,
  hasEquivalentSettingValues,
  normalizeSettingValue,
} = require('../dist/utils/settingValue');

test('setting values are trimmed and internal whitespace is collapsed', () => {
  assert.equal(
    cleanSettingValue('  Técnico   en\tVidrios\n y Aluminio  '),
    'Técnico en Vidrios y Aluminio'
  );
});

test('setting values compare without case, accent, or whitespace differences', () => {
  assert.equal(
    normalizeSettingValue('  TÉCNICO   en VIDRÍOS  '),
    normalizeSettingValue('tecnico en vidrios')
  );
});

test('normalization still distinguishes different service names', () => {
  assert.notEqual(
    normalizeSettingValue('Técnico en Refrigeración'),
    normalizeSettingValue('Técnico en Electrodomésticos')
  );
});

test('equivalent values are detected in a settings list', () => {
  assert.equal(
    hasEquivalentSettingValues(['Tapicero', '  TAPÍCERO  ']),
    true
  );
  assert.equal(
    hasEquivalentSettingValues(['Tapicero', 'Herrero']),
    false
  );
});
