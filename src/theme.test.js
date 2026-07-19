const tailwindConfig = require('../tailwind.config');

const palette = tailwindConfig.theme.extend.colors.brand;

function relativeLuminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));

  return (lighter + 0.05) / (darker + 0.05);
}

test('keeps the web palette tied to its semantic roles', () => {
  expect(palette.ink).toBe('#172B4D');
  expect(palette.charcoal).toBe('#182230');
  expect(palette.sand).toBe('#F7F8F5');
  expect(palette.ocean[500]).toBe('#2F6FED');
  expect(palette.clay[500]).toBe('#E86F2D');
  expect(palette.teal[600]).toBe('#168A72');
  expect(palette.danger[600]).toBe('#C43D3D');
});

test('interactive web colors preserve accessible contrast', () => {
  const white = palette.cream;

  expect(contrastRatio(palette.ocean[500], white)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(palette.clay[600], white)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(palette.teal[700], white)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(palette.danger[600], white)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(palette.control, white)).toBeGreaterThanOrEqual(3);
});
