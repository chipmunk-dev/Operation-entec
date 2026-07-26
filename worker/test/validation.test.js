import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReportPayload, ZONES } from '../src/validation.js';

const validPayload = () => ({
  inputs: Object.fromEntries(ZONES.map((zone) => [zone, ''])),
  columnPositions: { status: 1, policyName: 6, startTime: 7 },
  activeZone: ZONES[0],
});

test('accepts and normalizes a valid report', () => {
  const payload = validPayload();
  payload.inputs.NBUMASTER = '11\tDone\t\t\t\tPOLICY_A\tJun 11, 2026, 8:00:11 PM';
  const result = validateReportPayload(payload);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.columnPositions, payload.columnPositions);
});

test('rejects an empty report', () => {
  const result = validateReportPayload(validPayload());
  assert.equal(result.ok, false);
  assert.match(result.message, /데이터가 없습니다/);
});

test('rejects unknown zones and fields', () => {
  const unknownZone = validPayload();
  unknownZone.inputs.UNKNOWN = 'data';
  assert.equal(validateReportPayload(unknownZone).ok, false);

  const unknownField = validPayload();
  unknownField.inputs.NBUMASTER = 'data';
  unknownField.secret = 'not allowed';
  assert.equal(validateReportPayload(unknownField).ok, false);
});

test('rejects invalid or duplicate column positions', () => {
  const invalid = validPayload();
  invalid.inputs.NBUMASTER = 'data';
  invalid.columnPositions.status = 0;
  assert.equal(validateReportPayload(invalid).ok, false);

  const duplicate = validPayload();
  duplicate.inputs.NBUMASTER = 'data';
  duplicate.columnPositions.policyName = 1;
  assert.equal(validateReportPayload(duplicate).ok, false);
});
