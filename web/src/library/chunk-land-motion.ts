import * as THREE from 'three';

const LOAD_RISE_START_Y = -48;
const LOAD_RISE_MS = 190;
const UNLOAD_SINK_DISTANCE = 12;
const UNLOAD_SINK_MS = 85;
const LAND_FAILSAFE_MULTIPLIER = 1.5;
const GROUND_Y = 0;
const GROUND_EPSILON = 0.25;

export type ChunkLandState = 'settled' | 'rising' | 'sinking';

export type ChunkLandEntry = {
  object: THREE.Object3D;
  chunkX: number;
  chunkZ: number;
  landState: ChunkLandState;
  landStartedAt: number;
  landDurationMs: number;
  landStartY: number;
  landTargetY: number;
  onLandComplete?: (() => void) | null;
  pendingUnload?: (() => void) | null;
};

function easeOutCubic(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - clamped) ** 3;
}

function nowMs() {
  return performance.now();
}

export function createChunkLandMotion() {
  function startRise(entry: ChunkLandEntry) {
    entry.landState = 'rising';
    entry.landStartedAt = nowMs();
    entry.landDurationMs = LOAD_RISE_MS;
    entry.landStartY = LOAD_RISE_START_Y;
    entry.landTargetY = GROUND_Y;
    entry.object.position.y = entry.landStartY;
    entry.onLandComplete = null;
  }

  function startSink(entry: ChunkLandEntry, onComplete: () => void) {
    entry.landState = 'sinking';
    entry.landStartedAt = nowMs();
    entry.landDurationMs = UNLOAD_SINK_MS;
    entry.landStartY = entry.object.position.y;
    entry.landTargetY = entry.landStartY - UNLOAD_SINK_DISTANCE;
    entry.onLandComplete = onComplete;
    entry.pendingUnload = null;
  }

  function settleRise(entry: ChunkLandEntry) {
    entry.object.position.y = GROUND_Y;
    entry.landState = 'settled';
    entry.onLandComplete = null;
    const pending = entry.pendingUnload;
    entry.pendingUnload = null;
    pending?.();
  }

  function settleSink(entry: ChunkLandEntry) {
    entry.object.position.y = entry.landTargetY;
    const complete = entry.onLandComplete;
    entry.onLandComplete = null;
    entry.pendingUnload = null;
    entry.landState = 'settled';
    complete?.();
  }

  function tickEntry(entry: ChunkLandEntry) {
    if (!Number.isFinite(entry.landStartedAt) || entry.landStartedAt <= 0) {
      entry.landStartedAt = nowMs();
    }

    const elapsed = nowMs() - entry.landStartedAt;
    const duration = Math.max(1, entry.landDurationMs);
    const rawT = elapsed / duration;
    const progress = easeOutCubic(Math.min(1, rawT));
    entry.object.position.y = THREE.MathUtils.lerp(entry.landStartY, entry.landTargetY, progress);

    const finished = rawT >= 1 || elapsed >= duration * LAND_FAILSAFE_MULTIPLIER;
    if (!finished) {
      return;
    }

    if (entry.landState === 'rising') {
      settleRise(entry);
      return;
    }
    if (entry.landState === 'sinking') {
      settleSink(entry);
    }
  }

  function normalizeLandState(entry: ChunkLandEntry) {
    const state = entry.landState as string;
    if (state === 'dropping') {
      entry.landState = 'rising';
      if (!Number.isFinite(entry.landStartedAt) || entry.landStartedAt <= 0) {
        entry.landStartedAt = nowMs();
      }
      if (!Number.isFinite(entry.landDurationMs) || entry.landDurationMs <= 0) {
        entry.landDurationMs = LOAD_RISE_MS;
      }
      entry.landStartY = entry.object.position.y;
      entry.landTargetY = GROUND_Y;
    }
  }

  function reconcileGrounded(entry: ChunkLandEntry) {
    if (entry.landState === 'rising' || entry.landState === 'sinking') {
      return;
    }
    if (Math.abs(entry.object.position.y - GROUND_Y) > GROUND_EPSILON) {
      entry.object.position.y = GROUND_Y;
      entry.landState = 'settled';
    }
  }

  return {
    isAnimating(entry: ChunkLandEntry) {
      return entry.landState === 'rising' || entry.landState === 'sinking';
    },

    beginLoad(entry: ChunkLandEntry, enabled: boolean) {
      entry.pendingUnload = null;
      entry.onLandComplete = null;
      if (!enabled) {
        entry.landState = 'settled';
        entry.landStartedAt = 0;
        entry.landDurationMs = 0;
        entry.landStartY = GROUND_Y;
        entry.landTargetY = GROUND_Y;
        entry.object.position.y = GROUND_Y;
        return;
      }
      startRise(entry);
    },

    beginUnload(entry: ChunkLandEntry, enabled: boolean, onComplete: () => void) {
      if (!enabled) {
        entry.pendingUnload = null;
        entry.onLandComplete = null;
        entry.landState = 'settled';
        onComplete();
        return false;
      }
      if (entry.landState === 'rising') {
        entry.pendingUnload = () => {
          startSink(entry, onComplete);
        };
        return true;
      }
      if (entry.landState === 'sinking') {
        entry.onLandComplete = onComplete;
        return true;
      }
      startSink(entry, onComplete);
      return true;
    },

    cancel(entry: ChunkLandEntry) {
      entry.pendingUnload = null;
      entry.onLandComplete = null;
      entry.landState = 'settled';
      entry.object.position.y = GROUND_Y;
    },

    update(entries: Iterable<ChunkLandEntry>) {
      let active = 0;
      for (const entry of entries) {
        normalizeLandState(entry);
        if (entry.landState === 'rising' || entry.landState === 'sinking') {
          active += 1;
          tickEntry(entry);
          continue;
        }
        reconcileGrounded(entry);
      }
      return active;
    },

    activeCount(entries: Iterable<ChunkLandEntry>) {
      let count = 0;
      for (const entry of entries) {
        if (entry.landState === 'rising' || entry.landState === 'sinking') {
          count += 1;
        }
      }
      return count;
    },
  };
}
