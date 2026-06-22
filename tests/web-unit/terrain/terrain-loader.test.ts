import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  applyWaterMode,
  countOrphanChunkWrappers,
  finishDisposeChunk,
  loadChunk,
  loadGrid,
  maybeAutoStream,
  pruneOrphanChunkWrappers,
  reloadTerrainForVisualOptions,
  scheduleControlGridLoad,
  updateDebugBounds,
} from '../../../web/src/terrain/terrain-loader.ts';
import {
  disposalStats,
  loadedChunks,
  runtime,
  scene,
  chunkPlaceholderManager,
} from '../../../web/src/scene/scene-context.ts';
import {
  autoStreamInput,
  chunkXInput,
  chunkZInput,
  debugBoundsInput,
  mapTilesInput,
  waterModeInput,
  worldSelect,
} from '../../../web/src/ui/dom.ts';

// --- helpers ----------------------------------------------------------------

// A minimal valid GLB with one empty scene, so loader.parseAsync resolves to a
// real (empty) gltf.scene we can attach to the graph headlessly.
function makeEmptyGlb(): ArrayBuffer {
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }], nodes: [] };
  const enc = new TextEncoder();
  let jsonBytes = enc.encode(JSON.stringify(json));
  while (jsonBytes.length % 4 !== 0) {
    const padded = new Uint8Array(jsonBytes.length + 1);
    padded.set(jsonBytes);
    padded[jsonBytes.length] = 0x20;
    jsonBytes = padded;
  }
  const totalLength = 12 + 8 + jsonBytes.length;
  const buf = new ArrayBuffer(totalLength);
  const dv = new DataView(buf);
  dv.setUint32(0, 0x46546c67, true); // 'glTF'
  dv.setUint32(4, 2, true);
  dv.setUint32(8, totalLength, true);
  dv.setUint32(12, jsonBytes.length, true);
  dv.setUint32(16, 0x4e4f534a, true); // 'JSON'
  new Uint8Array(buf, 20).set(jsonBytes);
  return buf;
}

function glbResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    arrayBuffer: async () => makeEmptyGlb(),
  };
}

// Fire-and-forget telemetry (logClientTiming/logClientEvent) POSTs to
// /api/client-log after the awaited work returns. Keep a benign baseline stub
// installed for the whole file so those late fetches never reach the network and
// trip the runner's "async activity after the test ended" guard.
const baselineFetch = (async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  arrayBuffer: async () => new ArrayBuffer(0),
})) as unknown as typeof fetch;
const realFetch = globalThis.fetch;
function installFetch(stub: typeof fetch) {
  globalThis.fetch = stub;
  // client-log and api-client may resolve a bare `fetch` to window.fetch under
  // happy-dom, so keep both in sync.
  try {
    (globalThis as any).window.fetch = stub;
  } catch {
    // window may be non-writable in some environments; globalThis is enough.
  }
}
installFetch(baselineFetch);
process.on('exit', () => {
  installFetch(realFetch);
});

function withFetch(stub: typeof fetch, fn: () => Promise<void>) {
  installFetch(stub);
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      installFetch(baselineFetch);
    });
}

// happy-dom's <select> only accepts values that exist as <option>s, so register
// the 'default' world once before exercising loadGrid.
function ensureWorldOption() {
  if (!worldSelect.querySelector('option[value=""]')) {
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '';
    worldSelect.appendChild(blank);
  }
  if (!worldSelect.querySelector('option[value="default"]')) {
    const opt = document.createElement('option');
    opt.value = 'default';
    opt.textContent = 'default';
    worldSelect.appendChild(opt);
  }
}

function resetState() {
  ensureWorldOption();
  for (const [id, entry] of Array.from(loadedChunks.entries())) {
    finishDisposeChunk(id, entry);
  }
  loadedChunks.clear();
  // Remove any chunk wrappers that linger in the scene.
  for (const child of [...scene.children]) {
    if (child.name?.startsWith?.('chunk:')) scene.remove(child);
  }
  runtime.loadGeneration = 0;
  runtime.requestedCenterId = null;
  runtime.activeCenterId = null;
  runtime.hasFocusedInitialGrid = true;
  runtime.hasStarted = false;
  runtime.experimentalDetailsEnabled = false;
  worldSelect.value = 'default';
  chunkXInput.value = '0';
  chunkZInput.value = '0';
  autoStreamInput.checked = false;
  mapTilesInput.checked = false;
  debugBoundsInput.checked = false;
  waterModeInput.value = 'off';
}

// --- orphan wrapper bookkeeping ---------------------------------------------

test('countOrphanChunkWrappers / pruneOrphanChunkWrappers handle untracked chunk groups', () => {
  resetState();
  const orphan = new THREE.Group();
  orphan.name = 'chunk:9:9';
  scene.add(orphan);

  // A non-chunk child should never be counted.
  const decoy = new THREE.Group();
  decoy.name = 'not-a-chunk';
  scene.add(decoy);

  assert.equal(countOrphanChunkWrappers(), 1);

  // extraKeep lets us protect a wrapper from being treated as orphan.
  assert.equal(countOrphanChunkWrappers(orphan), 0);

  const beforeChunks = disposalStats.chunks;
  const removed = pruneOrphanChunkWrappers();
  assert.equal(removed, 1);
  assert.ok(!scene.children.includes(orphan));
  assert.ok(disposalStats.chunks >= beforeChunks + 1);

  scene.remove(decoy);
});

// --- loadGrid early-return guards -------------------------------------------

test('loadGrid bails out when no world is selected', async () => {
  resetState();
  worldSelect.value = '';
  const before = runtime.gridLoadCount;
  await loadGrid();
  assert.equal(runtime.gridLoadCount, before + 1);
  // No chunks loaded because of the early return.
  assert.equal(loadedChunks.size, 0);
});

test('loadGrid bails out on non-integer coordinates', async () => {
  resetState();
  chunkXInput.value = 'not-a-number';
  await loadGrid();
  assert.equal(loadedChunks.size, 0);
});

// --- loadGrid happy path: streams real (empty) chunks into the scene --------

test('loadGrid loads a radius-0 grid from the network and tracks the chunk', async () => {
  resetState();
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });

  assert.equal(loadedChunks.size, 1);
  const entry = loadedChunks.get('default:0:0');
  assert.ok(entry);
  assert.equal(entry.chunkX, 0);
  assert.equal(entry.chunkZ, 0);
  // Wrapper added to the scene at the chunk world position.
  assert.ok(scene.children.includes(entry.object));
  assert.equal(entry.object.position.x, 0);

  // Grid telemetry recorded.
  assert.ok(runtime.lastGridLoadTiming);
  assert.equal(runtime.lastGridLoadTiming.needed, 1);
  assert.equal(runtime.activeCenterId, 'default:0:0');
});

test('loadGrid skips chunks that are already loaded', async () => {
  resetState();
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });
  assert.equal(loadedChunks.size, 1);

  // Re-loading the same grid finds the chunk already present (alreadyLoaded path).
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });
  assert.equal(loadedChunks.size, 1);
  assert.equal(runtime.lastGridLoadTiming.alreadyLoaded, 1);
});

test('loadGrid records failures when the network rejects every chunk', async () => {
  resetState();
  await withFetch((async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
    arrayBuffer: async () => new ArrayBuffer(0),
  })) as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 1, centerZ: 1 });
  });
  // Failed promotion -> chunk never added.
  assert.equal(loadedChunks.has('default:1:1'), false);
  assert.equal(runtime.lastGridLoadTiming.failed, 1);
});

// --- loadChunk --------------------------------------------------------------

test('loadChunk returns true immediately for an already-loaded chunk', async () => {
  resetState();
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });
  const result = await loadChunk('default', 0, 0, runtime.loadGeneration);
  assert.equal(result, true);
});

test('loadChunk fetches, parses, and adds a brand-new chunk', async () => {
  resetState();
  const result = await withFetch(glbResponse as unknown as typeof fetch, async () => {
    return loadChunk('default', 4, 5, runtime.loadGeneration);
  });
  assert.equal(result, true);
  assert.ok(loadedChunks.has('default:4:5'));
});

test('loadChunk returns false when the load generation changed mid-flight', async () => {
  resetState();
  const generation = runtime.loadGeneration;
  const result = await withFetch((async () => {
    // Bump the generation while the request is "in flight".
    runtime.loadGeneration = generation + 1;
    return glbResponse();
  }) as unknown as typeof fetch, async () => {
    return loadChunk('default', 7, 7, generation);
  });
  assert.equal(result, false);
  assert.equal(loadedChunks.has('default:7:7'), false);
});

// --- mutators over loadedChunks ---------------------------------------------

test('updateDebugBounds toggles each chunk debug visibility', async () => {
  resetState();
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });
  const entry = loadedChunks.get('default:0:0');
  assert.ok(entry.debug);

  debugBoundsInput.checked = true;
  updateDebugBounds();
  assert.equal(entry.debug.visible, true);

  debugBoundsInput.checked = false;
  updateDebugBounds();
  assert.equal(entry.debug.visible, false);
});

test('applyWaterMode syncs the input and walks loaded chunks without throwing', async () => {
  resetState();
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });
  // waterModeValue() normalizes the control; applyWaterMode should run cleanly.
  applyWaterMode();
  assert.equal(loadedChunks.size, 1);
});

test('finishDisposeChunk removes the chunk from the scene and the map', async () => {
  resetState();
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });
  const entry = loadedChunks.get('default:0:0');
  assert.ok(scene.children.includes(entry.object));

  finishDisposeChunk('default:0:0', entry);
  assert.equal(loadedChunks.has('default:0:0'), false);
  assert.ok(!scene.children.includes(entry.object));

  // Disposing an unknown id is a safe no-op.
  finishDisposeChunk('default:0:0', entry);
  assert.equal(loadedChunks.has('default:0:0'), false);
});

test('reloadTerrainForVisualOptions clears all chunks and (re)schedules a load', async () => {
  resetState();
  await withFetch(glbResponse as unknown as typeof fetch, async () => {
    await loadGrid({ centerX: 0, centerZ: 0 });
  });
  assert.equal(loadedChunks.size, 1);

  // hasStarted=false so scheduleControlGridLoad short-circuits (no real timer fires).
  runtime.hasStarted = false;
  reloadTerrainForVisualOptions();
  assert.equal(loadedChunks.size, 0);
});

test('scheduleControlGridLoad short-circuits before the app has started', () => {
  resetState();
  runtime.hasStarted = false;
  runtime.controlLoadTimer = null;
  scheduleControlGridLoad();
  // No timer scheduled because hasStarted is false.
  assert.equal(runtime.controlLoadTimer, null);
});

test('scheduleControlGridLoad arms a debounce timer once started', () => {
  resetState();
  runtime.hasStarted = true;
  runtime.controlLoadTimer = null;
  scheduleControlGridLoad();
  // A timer handle was scheduled; cancel it so the deferred loadGrid never runs.
  assert.notEqual(runtime.controlLoadTimer, null);
  clearTimeout(runtime.controlLoadTimer);
  runtime.controlLoadTimer = null;
  runtime.hasStarted = false;
});

test('maybeAutoStream returns early when auto-stream is disabled', () => {
  resetState();
  autoStreamInput.checked = false;
  runtime.streamTimer = null;
  maybeAutoStream();
  assert.equal(runtime.streamTimer, null);
});

test('maybeAutoStream returns early when the player is already at the active center', () => {
  resetState();
  autoStreamInput.checked = true;
  runtime.hasFocusedInitialGrid = true;
  // playerChunk() floors camera.position (88,_,88)/32 -> chunk (2,2).
  runtime.activeCenterId = 'default:2:2';
  runtime.streamTimer = null;
  maybeAutoStream();
  assert.equal(runtime.streamTimer, null);

  autoStreamInput.checked = false;
});

test('maybeAutoStream arms a debounced stream load for a new player center', () => {
  resetState();
  autoStreamInput.checked = true;
  runtime.hasFocusedInitialGrid = true;
  runtime.activeCenterId = null;
  runtime.requestedCenterId = null;
  runtime.scheduledCenterId = null;
  runtime.streamTimer = null;

  maybeAutoStream();
  // scheduledCenterId set + a debounce timer armed. Cancel so it never fires.
  assert.equal(runtime.scheduledCenterId, 'default:2:2');
  assert.notEqual(runtime.streamTimer, null);
  clearTimeout(runtime.streamTimer);
  runtime.streamTimer = null;
  runtime.scheduledCenterId = null;
  autoStreamInput.checked = false;
});

// Keep the placeholder manager reachable so the import isn't tree-shaken in cov.
test('chunkPlaceholderManager is wired into the scene context', () => {
  assert.equal(typeof chunkPlaceholderManager.count, 'function');
});
