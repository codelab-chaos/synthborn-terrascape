import assert from 'node:assert/strict';
import test from 'node:test';

import {
  base64ToArrayBuffer,
  centerId,
  chunkId,
  clamp,
  formatBytes,
  formatCoord,
  numberOr,
} from '../../../web/src/common/utils.ts';

test('builds chunk and center identifiers', () => {
  assert.equal(chunkId('default', -2, 7), 'default:-2:7');
  assert.equal(centerId('arena', 0, 0), 'arena:0:0');
});

test('numberOr falls back only on NaN', () => {
  assert.equal(numberOr(42, 0), 42);
  assert.equal(numberOr(0, 5), 0);
  assert.equal(numberOr(Number.NaN, 5), 5);
});

test('formatCoord rounds to a string', () => {
  assert.equal(formatCoord(3.4), '3');
  assert.equal(formatCoord(3.6), '4');
  assert.equal(formatCoord(-2.5), '-2');
});

test('clamp bounds values to the range', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test('formatBytes renders human-friendly sizes', () => {
  assert.equal(formatBytes(0), '');
  assert.equal(formatBytes(-5), '');
  assert.equal(formatBytes(Number.NaN), '');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
});

test('base64ToArrayBuffer decodes to bytes', () => {
  const buffer = base64ToArrayBuffer('aGk='); // "hi"
  assert.deepEqual([...new Uint8Array(buffer)], [104, 105]);
});
