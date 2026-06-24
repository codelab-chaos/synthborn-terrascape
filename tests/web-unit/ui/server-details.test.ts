import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatBytesCompact,
  formatPercent,
  renderServerDetails,
  renderServerDetailsUnavailable,
} from '../../../web/src/ui/server-details.ts';
import {
  serverCpuValueEl,
  serverDetailCpuEl,
  serverDetailHostCpuEl,
  serverDetailHostMemoryEl,
  serverDetailMemoryEl,
  serverDetailThreadsEl,
  serverDetailUpdatedEl,
  serverMemoryValueEl,
} from '../../../web/src/ui/dom.ts';

test('formatPercent renders Java load factors as percentages', () => {
  assert.equal(formatPercent(0.236), '24%');
  assert.equal(formatPercent(-1), '--');
  assert.equal(formatPercent(null), '0%');
  assert.equal(formatPercent('bad'), '--');
});

test('formatBytesCompact uses compact KB/MB/GB labels', () => {
  assert.equal(formatBytesCompact(0), '--');
  assert.equal(formatBytesCompact(512), '1 KB');
  assert.equal(formatBytesCompact(64 * 1024 * 1024), '64.0 MB');
  assert.equal(formatBytesCompact(12 * 1024 * 1024 * 1024), '12 GB');
});

test('renderServerDetails writes header and expanded server metrics', () => {
  renderServerDetails({
    processCpuLoad: 0.12,
    systemCpuLoad: 0.56,
    availableProcessors: 8,
    heapUsedBytes: 512 * 1024 * 1024,
    heapMaxBytes: 2 * 1024 * 1024 * 1024,
    heapCommittedBytes: 768 * 1024 * 1024,
    freeMemoryBytes: 6 * 1024 * 1024 * 1024,
    totalMemoryBytes: 16 * 1024 * 1024 * 1024,
    threads: 42,
    timestampMs: Date.UTC(2026, 0, 2, 3, 4, 5),
  });

  assert.equal(serverCpuValueEl.textContent, '12%');
  assert.equal(serverMemoryValueEl.textContent, '512 MB / 2.0 GB');
  assert.equal(serverDetailCpuEl.textContent, 'Hytale 12% · 8 cores');
  assert.equal(serverDetailHostCpuEl.textContent, '56%');
  assert.match(serverDetailMemoryEl.textContent ?? '', /committed 768 MB/);
  assert.equal(serverDetailHostMemoryEl.textContent, '10 GB / 16 GB · free 6.0 GB');
  assert.equal(serverDetailThreadsEl.textContent, '42');
  assert.notEqual(serverDetailUpdatedEl.textContent, 'pending');
});

test('renderServerDetailsUnavailable clears summary fields', () => {
  renderServerDetailsUnavailable('disabled');
  assert.equal(serverCpuValueEl.textContent, '--');
  assert.equal(serverMemoryValueEl.textContent, '--');
  assert.equal(serverDetailCpuEl.textContent, 'disabled');
  assert.equal(serverDetailUpdatedEl.textContent, 'not connected');
});
