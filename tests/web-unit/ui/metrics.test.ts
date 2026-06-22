import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectResourceStats,
  updateMetrics,
  maybeUpdateMetrics,
} from '../../../web/src/ui/metrics.ts';
import {
  loadedChunks,
  mobMarkers,
  runtime,
} from '../../../web/src/scene/scene-context.ts';
import {
  mapTilesInput,
  metricCenterEl,
  metricLoadedEl,
  metricMobsEl,
  showMobsInput,
} from '../../../web/src/ui/dom.ts';

test('collectResourceStats summarises the (empty) loaded chunk set', () => {
  loadedChunks.clear();
  const stats = collectResourceStats();
  assert.equal(typeof stats.meshes, 'number');
  assert.equal(typeof stats.geometries, 'number');
});

test('updateMetrics renders loaded-chunk count and center placeholder', () => {
  loadedChunks.clear();
  mobMarkers.clear();
  mapTilesInput.checked = false;
  showMobsInput.checked = false;
  runtime.activeCenterId = null;

  updateMetrics();

  assert.equal(metricLoadedEl.textContent, '0 chunks');
  assert.equal(metricCenterEl.textContent, 'pending');
  // Mobs hidden => "hidden".
  assert.equal(metricMobsEl.textContent, 'hidden');
  assert.ok(runtime.lastMetricsUpdate > 0);
});

test('updateMetrics shows the center coords and mob summary when present', () => {
  loadedChunks.clear();
  mobMarkers.clear();
  mobMarkers.set('a', { userData: { mob: { type: 'Zombie' } } } as any);
  mobMarkers.set('b', { userData: { mob: { type: 'Zombie' } } } as any);
  mobMarkers.set('c', { userData: { mob: { category: 'Cow' } } } as any);
  showMobsInput.checked = true;
  runtime.activeCenterId = 'world:3:5';
  runtime.lastMobSourceStats = null;

  updateMetrics();

  assert.equal(metricCenterEl.textContent, '3, 5');
  // Summary lists the dominant type counts.
  assert.match(metricMobsEl.textContent ?? '', /Zombie 2/);
  assert.match(metricMobsEl.textContent ?? '', /Cow 1/);

  mobMarkers.clear();
  showMobsInput.checked = false;
});

test('maybeUpdateMetrics throttles unless forced', () => {
  runtime.lastMetricsUpdate = performance.now();
  const before = runtime.lastMetricsUpdate;
  // Within the interval and not forced: no update.
  maybeUpdateMetrics(false);
  assert.equal(runtime.lastMetricsUpdate, before);
  // Forced: updates timestamp.
  maybeUpdateMetrics(true);
  assert.ok(runtime.lastMetricsUpdate >= before);
});
