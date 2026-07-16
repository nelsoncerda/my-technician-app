import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getRatingLabel } from '../src/lib/rating';
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

test('rating accessibility labels use ratings-only language', () => {
  assert.equal(getRatingLabel(0, 0), 'Sin calificaciones todavía');
  assert.equal(getRatingLabel(4.8, 0), 'Excelente, 4.8 de 5');
  assert.equal(getRatingLabel(4.8, 1), 'Excelente, 4.8 de 5, 1 calificación');
  assert.equal(getRatingLabel(4.8, 12), 'Excelente, 4.8 de 5, 12 calificaciones');
  assert.equal(getRatingLabel(4.8, 12).includes('reseña'), false);
});

test('the mobile technician API does not expose review submission', () => {
  const apiSource = readFileSync('src/lib/api.ts', 'utf8');

  assert.match(apiSource, /\/api\/technicians\?view=ratings/);
  assert.doesNotMatch(apiSource, /\baddReview\b/);
  assert.doesNotMatch(apiSource, /\/reviews[^'"`]*['"`]\s*,\s*\{\s*method:\s*['"]POST['"]/s);
});
