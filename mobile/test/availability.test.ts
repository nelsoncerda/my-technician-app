import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdditionalAvailabilitySlot,
  getAvailabilitySlotErrors,
  normalizeAvailabilitySlots,
} from '../src/lib/availability';
import type { WeeklyAvailabilitySlot } from '../src/lib/availability-api';

test('availability normalization preserves every saved window for a weekday', () => {
  const normalized = normalizeAvailabilitySlots([
    { dayOfWeek: 1, startTime: '13:00', endTime: '18:00', isAvailable: true },
    { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isAvailable: true },
  ]);

  assert.deepEqual(
    normalized.filter((slot) => slot.dayOfWeek === 1),
    [
      { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isAvailable: true },
      { dayOfWeek: 1, startTime: '13:00', endTime: '18:00', isAvailable: true },
    ]
  );
  assert.deepEqual(
    normalized.filter((slot) => slot.dayOfWeek === 2),
    [{ dayOfWeek: 2, startTime: '08:00', endTime: '18:00', isAvailable: false }]
  );
});

test('availability validation rejects overlapping windows without rejecting adjacent ones', () => {
  const slots: WeeklyAvailabilitySlot[] = [
    { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isAvailable: true },
    { dayOfWeek: 1, startTime: '11:00', endTime: '14:00', isAvailable: true },
    { dayOfWeek: 1, startTime: '11:30', endTime: '13:00', isAvailable: true },
    { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', isAvailable: true },
    { dayOfWeek: 2, startTime: '12:00', endTime: '17:00', isAvailable: true },
  ];

  const errors = getAvailabilitySlotErrors(slots);
  assert.match(errors[0], /solaparse/);
  assert.match(errors[1], /solaparse/);
  assert.match(errors[2], /solaparse/);
  assert.equal(errors[3], '');
  assert.equal(errors[4], '');
});

test('a new availability window starts after existing windows when space remains', () => {
  const slot = createAdditionalAvailabilitySlot([
    { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isAvailable: true },
    { dayOfWeek: 1, startTime: '13:00', endTime: '18:00', isAvailable: true },
  ], 1);

  assert.deepEqual(slot, {
    dayOfWeek: 1,
    startTime: '18:00',
    endTime: '19:00',
    isAvailable: true,
  });
});
