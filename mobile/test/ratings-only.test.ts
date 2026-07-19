import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getRatingLabel } from '../src/lib/rating';
import {
  createTechnicianMapMarkers,
  resolveSelectedMarkerId,
} from '../src/lib/map';
import {
  normalizeTechnician,
  type TechnicianApiPayload,
} from '../src/lib/technician';

const baseTechnician = {
  id: 'tech-1',
  name: 'María Técnica',
  specialization: 'Electricista',
  location: 'Santiago',
  verified: true,
} satisfies Omit<TechnicianApiPayload, 'rating' | 'ratingCount' | 'reviews'>;

test('normalizes legacy reviews to an aggregate rating without exposing written content', () => {
  const technician = normalizeTechnician({
    ...baseTechnician,
    rating: 4.8,
    reviews: [
      { author: 'Cliente A', comment: 'Excelente servicio', rating: 5 },
      { author: 'Cliente B', comment: 'Llegó a tiempo', rating: 4 },
    ],
  });

  assert.equal(technician.rating, 4.8);
  assert.equal(technician.ratingCount, 2);
  assert.equal('reviews' in technician, false);
  assert.equal(JSON.stringify(technician).includes('Excelente servicio'), false);
  assert.equal(JSON.stringify(technician).includes('Cliente A'), false);
});

test('falls back to individual numeric ratings when the aggregate is unavailable', () => {
  const technician = normalizeTechnician({
    ...baseTechnician,
    rating: 0,
    reviews: [{ rating: 5 }, { rating: 3 }, { rating: 'invalid' }],
  });

  assert.equal(technician.rating, 4);
  assert.equal(technician.ratingCount, 2);
});

test('preserves an aggregate rating even when individual rating records are omitted', () => {
  const technician = normalizeTechnician({
    ...baseTechnician,
    rating: 4.9,
    ratingCount: 18,
  });

  assert.equal(technician.rating, 4.9);
  assert.equal(technician.ratingCount, 18);
});

test('normalizes only privacy-safe approximate map locations', () => {
  const technician = normalizeTechnician({
    ...baseTechnician,
    email: 'private@example.com',
    phone: '+18095550101',
    mapLocation: {
      latitude: 19.45,
      longitude: -70.7,
      radiusKm: 4,
      precision: 'approximate',
    },
  });

  assert.deepEqual(technician.mapLocation, {
    latitude: 19.45,
    longitude: -70.7,
    radiusKm: 4,
    precision: 'approximate',
  });

  const [marker] = createTechnicianMapMarkers([technician]);
  assert.equal(marker.id, technician.id);
  assert.equal(marker.precision, 'approximate');
  assert.equal('email' in marker, false);
  assert.equal('phone' in marker, false);
  assert.equal(JSON.stringify(marker).includes('private@example.com'), false);
});

test('drops invalid or non-approximate public map locations', () => {
  const technician = normalizeTechnician({
    ...baseTechnician,
    mapLocation: {
      latitude: 19.4512345,
      longitude: -70.7012345,
      radiusKm: 0,
      precision: 'exact',
    },
  });

  assert.equal(technician.mapLocation, null);
  assert.deepEqual(createTechnicianMapMarkers([technician]), []);
});

test('map view selection follows visible markers across list/map toggles and filters', () => {
  const first = normalizeTechnician({
    ...baseTechnician,
    id: 'tech-1',
    mapLocation: {
      latitude: 19.45,
      longitude: -70.7,
      radiusKm: 4,
      precision: 'approximate',
    },
  });
  const second = normalizeTechnician({
    ...baseTechnician,
    id: 'tech-2',
    mapLocation: {
      latitude: 19.48,
      longitude: -70.65,
      radiusKm: 3,
      precision: 'approximate',
    },
  });
  const allMarkers = createTechnicianMapMarkers([first, second]);

  assert.equal(resolveSelectedMarkerId(allMarkers, null), 'tech-1');
  assert.equal(resolveSelectedMarkerId(allMarkers, 'tech-2'), 'tech-2');
  assert.equal(resolveSelectedMarkerId(allMarkers.slice(0, 1), 'tech-2'), 'tech-1');
  assert.equal(resolveSelectedMarkerId([], 'tech-1'), null);
});

test('overlapping approximate service areas remain independently selectable', () => {
  const mapLocation = {
    latitude: 19.45,
    longitude: -70.7,
    radiusKm: 4,
    precision: 'approximate' as const,
  };
  const first = normalizeTechnician({ ...baseTechnician, id: 'tech-1', mapLocation });
  const second = normalizeTechnician({ ...baseTechnician, id: 'tech-2', mapLocation });
  const markers = createTechnicianMapMarkers([first, second]);

  assert.equal(markers.length, 2);
  assert.notDeepEqual(markers[0].coordinate, markers[1].coordinate);
  assert.deepEqual(markers[0].serviceAreaCenter, markers[1].serviceAreaCenter);
});

test('the Android Maps key is environment-backed and the web fallback is native-module free', () => {
  const appConfigSource = readFileSync('app.config.js', 'utf8');
  const webMapSource = readFileSync(
    'src/components/technician/TechnicianMap.tsx',
    'utf8'
  );
  const nativeMapSource = readFileSync(
    'src/components/technician/TechnicianMap.native.tsx',
    'utf8'
  );

  assert.match(appConfigSource, /process\.env\.GOOGLE_MAPS_ANDROID_API_KEY/);
  assert.doesNotMatch(appConfigSource, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(webMapSource, /from ['"]react-native-maps['"]/);
  assert.match(nativeMapSource, /from ['"]react-native-maps['"]/);
});

test('rating accessibility labels use ratings-only language', () => {
  assert.equal(getRatingLabel(0, 0), 'Sin calificaciones todavía');
  assert.equal(getRatingLabel(4.8, 0), 'Excelente, 4.8 de 5');
  assert.equal(getRatingLabel(4.8, 1), 'Excelente, 4.8 de 5, 1 calificación');
  assert.equal(getRatingLabel(4.8, 12), 'Excelente, 4.8 de 5, 12 calificaciones');
  assert.equal(getRatingLabel(4.8, 12).includes('reseña'), false);
});

test('review submission is supported while the public directory remains ratings-only', () => {
  const apiSource = readFileSync('src/lib/api.ts', 'utf8');
  const bookingDetailSource = readFileSync('src/app/booking-detail/[id].tsx', 'utf8');

  assert.match(apiSource, /\/api\/technicians\?view=ratings/);
  assert.match(apiSource, /\baddReview\b/);
  assert.match(apiSource, /\/reviews[^'"`]*['"`]\s*,\s*\{\s*method:\s*['"]POST['"]/s);
  assert.match(bookingDetailSource, /REVIEW_FEEDBACK_OPTIONS/);
  assert.doesNotMatch(bookingDetailSource, /reviewComment/);
});

test('profile photos use the library picker without camera or microphone access', () => {
  const appConfig = JSON.parse(readFileSync('app.json', 'utf8')) as {
    expo?: { plugins?: unknown[] };
  };
  const profileEditSource = readFileSync('src/app/profile/edit.tsx', 'utf8');
  const storeConfig = JSON.parse(readFileSync('store.config.json', 'utf8')) as {
    apple?: { advisory?: { userGeneratedContent?: boolean } };
  };
  const imagePickerPlugin = appConfig.expo?.plugins?.find(
    (plugin): plugin is [string, Record<string, unknown>] =>
      Array.isArray(plugin) && plugin[0] === 'expo-image-picker',
  );

  assert.ok(typeof imagePickerPlugin?.[1]?.photosPermission === 'string');
  assert.ok(String(imagePickerPlugin?.[1]?.photosPermission).length > 20);
  assert.equal(imagePickerPlugin?.[1]?.cameraPermission, false);
  assert.equal(imagePickerPlugin?.[1]?.microphonePermission, false);
  assert.match(profileEditSource, /launchImageLibraryAsync/);
  assert.doesNotMatch(profileEditSource, /requestMediaLibraryPermissionsAsync/);
  assert.equal(storeConfig.apple?.advisory?.userGeneratedContent, true);
});

test('session persistence strips embedded photos and guards async updates by identity', () => {
  const authSource = readFileSync('src/providers/auth.tsx', 'utf8');

  assert.match(authSource, /startsWith\(['"]data:['"]\)/);
  assert.match(authSource, /JSON\.stringify\(toPersistableSession\(session\)\)/);
  assert.match(authSource, /matchesSessionIdentity/);
  assert.match(authSource, /session\?\.token === expected\.token/);
  assert.match(authSource, /session\.user\.id === expected\.userId/);
  assert.match(authSource, /storageWriteRef/);
});

test('the iOS build declares the motion purpose string required by expo-location', () => {
  const appConfig = JSON.parse(readFileSync('app.json', 'utf8')) as {
    expo?: { plugins?: unknown[] };
  };
  const locationPlugin = appConfig.expo?.plugins?.find(
    (plugin): plugin is [string, Record<string, unknown>] =>
      Array.isArray(plugin) && plugin[0] === 'expo-location',
  );
  const purpose = locationPlugin?.[1]?.motionUsagePermission;

  assert.ok(typeof purpose === 'string');
  assert.ok(purpose.trim().length > 20);
  assert.equal(locationPlugin?.[1]?.isIosBackgroundLocationEnabled, false);
});
