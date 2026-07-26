import assert from 'node:assert/strict';

const apiUrl = process.env.API_URL || 'http://localhost:8787';
const origin = process.env.TEST_ORIGIN || 'http://localhost:5173';

const call = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json();
  return { response, body };
};

const health = await call('/api/health');
assert.equal(health.response.status, 200);
assert.equal(health.body.status, 'ok');

const initialLoad = await call('/api/backup-report');
assert.equal(initialLoad.response.status, 200);
assert.ok(['empty', 'success'].includes(initialLoad.body.status));

const malformed = await call('/api/backup-report', {
  method: 'PUT',
  body: JSON.stringify({ inputs: {} }),
});
assert.equal(malformed.response.status, 400);

const payload = {
  inputs: {
    'P-EUBKMST': '',
    NBUMASTER: '11\tDone\t\t\t\tPOLICY_A\tJun 11, 2026, 8:00:11 PM',
    EXTMASTER: '',
  },
  columnPositions: { status: 1, policyName: 6, startTime: 7 },
  activeZone: 'NBUMASTER',
};

const saved = await call('/api/backup-report', {
  method: 'PUT',
  body: JSON.stringify(payload),
});
assert.equal(saved.response.status, 200);
assert.equal(saved.body.status, 'success');

const saveLimited = await call('/api/backup-report', {
  method: 'PUT',
  body: JSON.stringify(payload),
});
assert.equal(saveLimited.response.status, 429);
assert.equal(saveLimited.body.action, 'save');

const loadLimited = await call('/api/backup-report');
assert.equal(loadLimited.response.status, 429);
assert.equal(loadLimited.body.action, 'load');

const forbidden = await fetch(`${apiUrl}/api/health`, {
  headers: { Origin: 'https://example.invalid' },
});
assert.equal(forbidden.status, 403);

await new Promise((resolve) => setTimeout(resolve, 10_100));

const loaded = await call('/api/backup-report');
assert.equal(loaded.response.status, 200);
assert.equal(loaded.body.status, 'success');
assert.deepEqual(loaded.body.data, payload);

console.log('local Worker integration checks passed');
