"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAreaValidationError = void 0;
exports.normalizeServiceAreaInput = normalizeServiceAreaInput;
exports.getKnownServiceArea = getKnownServiceArea;
exports.toPublicMapLocation = toPublicMapLocation;
const COORDINATE_DECIMALS = 2;
const DEFAULT_RADIUS_KM = 5;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 100;
// These are neighborhood/municipality centroids, never a provider's address.
// More specific aliases must appear before the general Santiago fallback.
const KNOWN_SERVICE_AREAS = [
    { aliases: ['los jardines', 'jardines metropolitanos'], latitude: 19.4628, longitude: -70.6928, radiusKm: 3 },
    { aliases: ['bella vista'], latitude: 19.4427, longitude: -70.7095, radiusKm: 3 },
    { aliases: ['reparto del este'], latitude: 19.451, longitude: -70.675, radiusKm: 3 },
    { aliases: ['los pepines'], latitude: 19.4486, longitude: -70.6994, radiusKm: 3 },
    { aliases: ['cienfuegos'], latitude: 19.4712, longitude: -70.734, radiusKm: 3 },
    { aliases: ['gurabo'], latitude: 19.4873, longitude: -70.6617, radiusKm: 4 },
    { aliases: ['tamboril'], latitude: 19.4873, longitude: -70.6126, radiusKm: 5 },
    { aliases: ['licey al medio', 'licey'], latitude: 19.4287, longitude: -70.5969, radiusKm: 5 },
    { aliases: ['villa gonzalez'], latitude: 19.5398, longitude: -70.7893, radiusKm: 5 },
    { aliases: ['punal'], latitude: 19.3957, longitude: -70.6479, radiusKm: 5 },
    { aliases: ['navarrete', 'villa bisono', 'bisono'], latitude: 19.5618, longitude: -70.8744, radiusKm: 6 },
    { aliases: ['baitoa'], latitude: 19.328, longitude: -70.7043, radiusKm: 6 },
    { aliases: ['san jose de las matas', 'sajoma'], latitude: 19.3372, longitude: -70.9372, radiusKm: 8 },
    { aliases: ['janico'], latitude: 19.3251, longitude: -70.8151, radiusKm: 7 },
    { aliases: ['sabana iglesia'], latitude: 19.3247, longitude: -70.7513, radiusKm: 6 },
    {
        aliases: ['santiago de los caballeros', 'santiago centro', 'santiago'],
        latitude: 19.4508,
        longitude: -70.6947,
        radiusKm: 8,
    },
];
class ServiceAreaValidationError extends Error {
}
exports.ServiceAreaValidationError = ServiceAreaValidationError;
function normalizeLocationLabel(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
function round(value, decimals) {
    const factor = 10 ** decimals;
    const rounded = Math.round(value * factor) / factor;
    return Object.is(rounded, -0) ? 0 : rounded;
}
function assertFiniteNumber(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ServiceAreaValidationError(`${label} debe ser un número válido`);
    }
}
/**
 * Validates and deliberately coarsens a provider-selected point before it is
 * stored. Two decimal places are roughly one kilometer in the Dominican
 * Republic, which is useful for browsing without publishing a home address.
 */
function normalizeServiceAreaInput(value) {
    if (value === null)
        return null;
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new ServiceAreaValidationError('El área de servicio no es válida');
    }
    const input = value;
    const latitude = input.latitude;
    const longitude = input.longitude;
    const radiusKm = input.radiusKm === undefined ? DEFAULT_RADIUS_KM : input.radiusKm;
    assertFiniteNumber(latitude, 'La latitud');
    assertFiniteNumber(longitude, 'La longitud');
    assertFiniteNumber(radiusKm, 'El radio');
    if (latitude < -90 || latitude > 90) {
        throw new ServiceAreaValidationError('La latitud debe estar entre -90 y 90');
    }
    if (longitude < -180 || longitude > 180) {
        throw new ServiceAreaValidationError('La longitud debe estar entre -180 y 180');
    }
    if (radiusKm < MIN_RADIUS_KM || radiusKm > MAX_RADIUS_KM) {
        throw new ServiceAreaValidationError(`El radio debe estar entre ${MIN_RADIUS_KM} y ${MAX_RADIUS_KM} km`);
    }
    return {
        latitude: round(latitude, COORDINATE_DECIMALS),
        longitude: round(longitude, COORDINATE_DECIMALS),
        radiusKm: round(radiusKm, 1),
    };
}
function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function spreadCentroid(area, technicianId) {
    const hash = hashString(technicianId);
    const angle = ((hash % 3600) / 3600) * Math.PI * 2;
    // Spread overlapping pins by at most 750 m. The point remains a service-area
    // marker and must not be interpreted as the technician's live/exact position.
    const maxJitterKm = Math.min(0.75, area.radiusKm * 0.18);
    const distanceKm = maxJitterKm * (0.35 + (((hash >>> 12) % 650) / 1000));
    const latitudeOffset = (distanceKm * Math.cos(angle)) / 111.32;
    const longitudeKmPerDegree = 111.32 * Math.cos((area.latitude * Math.PI) / 180);
    const longitudeOffset = (distanceKm * Math.sin(angle)) / longitudeKmPerDegree;
    return {
        latitude: round(area.latitude + latitudeOffset, 5),
        longitude: round(area.longitude + longitudeOffset, 5),
        radiusKm: area.radiusKm,
    };
}
function getKnownServiceArea(location, technicianId) {
    const normalizedLocation = normalizeLocationLabel(location);
    if (!normalizedLocation)
        return null;
    const area = KNOWN_SERVICE_AREAS.find(({ aliases }) => aliases.some((alias) => normalizedLocation.includes(alias)));
    return area ? spreadCentroid(area, technicianId) : null;
}
function toPublicMapLocation(technician) {
    if (technician.mapVisible === false)
        return null;
    const latitude = technician.serviceAreaLatitude;
    const longitude = technician.serviceAreaLongitude;
    if (typeof latitude === 'number' && Number.isFinite(latitude) &&
        latitude >= -90 && latitude <= 90 &&
        typeof longitude === 'number' && Number.isFinite(longitude) &&
        longitude >= -180 && longitude <= 180) {
        const storedRadius = technician.serviceAreaRadiusKm;
        const radiusKm = typeof storedRadius === 'number' && Number.isFinite(storedRadius)
            ? Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, storedRadius))
            : DEFAULT_RADIUS_KM;
        return {
            // Defense in depth: legacy imports or direct database writes must never
            // bypass the same privacy rounding applied at request validation.
            latitude: round(latitude, COORDINATE_DECIMALS),
            longitude: round(longitude, COORDINATE_DECIMALS),
            radiusKm: round(radiusKm, 1),
            precision: 'approximate',
        };
    }
    const fallback = getKnownServiceArea(technician.location, technician.id);
    return fallback ? Object.assign(Object.assign({}, fallback), { precision: 'approximate' }) : null;
}
