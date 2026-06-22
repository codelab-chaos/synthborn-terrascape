import assert from 'node:assert/strict';
import test from 'node:test';

import { apiFetch, onUnauthorized } from '../../../web/src/platform/api-client.ts';

test('apiFetch passes through the response and fires onUnauthorized once on 401', async () => {
  let nextStatus = 200;
  const original = globalThis.fetch;
  const seen: any[] = [];
  globalThis.fetch = (async (input, init) => {
    seen.push({ input, init });
    return { status: nextStatus, input, init };
  }) as any;
  try {
    let unauthorized = 0;
    onUnauthorized(() => { unauthorized++; });

    // 2xx passes through without firing the handler
    nextStatus = 200;
    const ok = await apiFetch('/api/worlds');
    assert.equal(ok.status, 200);
    assert.equal(seen[0].input, '/api/worlds');
    assert.equal(unauthorized, 0);

    // first 401 fires the handler and still returns the response
    nextStatus = 401;
    const denied: any = await apiFetch('/api/terrain', { method: 'GET' });
    assert.equal(denied.status, 401);
    assert.deepEqual(denied.init, { method: 'GET' });
    assert.equal(unauthorized, 1);

    // subsequent 401s are de-duped — the banner only shows once
    await apiFetch('/api/mobs');
    assert.equal(unauthorized, 1);
  } finally {
    globalThis.fetch = original;
  }
});
