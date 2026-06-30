import assert from 'node:assert/strict';
import test from 'node:test';

import { runMapRconCommand } from '../../../web/src/platform/map-rcon.ts';

test('runMapRconCommand posts through the map API endpoint', async () => {
  const original = globalThis.fetch;
  const seen: any[] = [];
  globalThis.fetch = (async (input, init) => {
    seen.push({ input, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, command: 'terrascape status', messages: ['ok'] }),
    };
  }) as any;
  try {
    const result = await runMapRconCommand('terrascape status');

    assert.equal(result.command, 'terrascape status');
    assert.deepEqual(result.messages, ['ok']);
    assert.equal(seen[0].input, '/api/rcon/command');
    assert.equal(seen[0].init.method, 'POST');
    assert.equal(seen[0].init.headers['Content-Type'], 'application/json');
    assert.equal(JSON.parse(seen[0].init.body).command, 'terrascape status');
  } finally {
    globalThis.fetch = original;
  }
});

test('runMapRconCommand rejects blank commands before fetching', async () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error('unexpected fetch');
  }) as any;
  try {
    await assert.rejects(() => runMapRconCommand('   '), /Command is required/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});
