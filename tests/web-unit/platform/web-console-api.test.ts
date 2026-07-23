import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadWebConsoleHistory,
  loadWebConsoleSession,
  submitWebConsoleInput,
} from '../../../web/src/platform/web-console-api.ts';

test('session returns null for anonymous/disabled endpoints and throws for server errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => ({ ok: false, status: 403 })) as any;
    assert.equal(await loadWebConsoleSession(), null);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as any;
    assert.equal(await loadWebConsoleSession(), null);
    globalThis.fetch = (async () => ({ ok: false, status: 500 })) as any;
    await assert.rejects(loadWebConsoleSession(), /Console session failed \(500\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('history clamps cursor and validates entries', async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  try {
    globalThis.fetch = (async (input) => {
      urls.push(String(input));
      return { ok: true, status: 200, json: async () => ({ entries: [{ id: 1 }] }) };
    }) as any;
    assert.deepEqual(await loadWebConsoleHistory(-20), [{ id: 1 }]);
    assert.equal(urls[0], '/api/console/history?after=0');

    globalThis.fetch = (async () => ({
      ok: true, status: 200, json: async () => ({ entries: 'invalid' }),
    })) as any;
    assert.deepEqual(await loadWebConsoleHistory(4), []);

    globalThis.fetch = (async () => ({ ok: false, status: 500 })) as any;
    await assert.rejects(loadWebConsoleHistory(), /Console history failed \(500\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('submit sends JSON and surfaces JSON or status-based failures', async () => {
  const originalFetch = globalThis.fetch;
  let requestInit: RequestInit | undefined;
  try {
    globalThis.fetch = (async (_input, init) => {
      requestInit = init;
      return { ok: true, status: 200 };
    }) as any;
    await submitWebConsoleInput('hello');
    assert.equal(requestInit?.method, 'POST');
    assert.equal(requestInit?.body, JSON.stringify({ input: 'hello' }));

    globalThis.fetch = (async () => ({
      ok: false, status: 429, json: async () => ({ message: 'Please wait.' }),
    })) as any;
    await assert.rejects(submitWebConsoleInput('again'), /Please wait\./);

    globalThis.fetch = (async () => ({
      ok: false, status: 503, json: async () => { throw new Error('not json'); },
    })) as any;
    await assert.rejects(submitWebConsoleInput('again'), /Console submission failed \(503\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
