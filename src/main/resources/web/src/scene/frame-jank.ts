import { logClientEvent } from '../platform/client-log.ts';

const HITCH_THRESHOLD_MS = 50;
const SEVERE_HITCH_THRESHOLD_MS = 100;
const BUFFER_SIZE = 300;

export type LoadKind = 'none' | 'grid' | 'batch' | 'backdrop';

function percentile(sorted: number[], ratio: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

export function createFrameJankRecorder() {
  const frameMs = new Array<number>(BUFFER_SIZE);
  let frameCount = 0;
  let lastFrameAt = performance.now();
  let activeLoadKind: LoadKind = 'none';
  let hitchCount50 = 0;
  let hitchCount100 = 0;
  let longestHitchMs = 0;
  let hitchWhileLoading = 0;

  function pushFrame(deltaMs: number) {
    const slot = frameCount % BUFFER_SIZE;
    frameMs[slot] = deltaMs;
    frameCount += 1;
  }

  return {
    setActiveLoadKind(kind: LoadKind) {
      activeLoadKind = kind;
    },

    getActiveLoadKind(): LoadKind {
      return activeLoadKind;
    },

    recordFrame() {
      const now = performance.now();
      const deltaMs = now - lastFrameAt;
      lastFrameAt = now;
      pushFrame(deltaMs);

      if (deltaMs < HITCH_THRESHOLD_MS) {
        return;
      }

      hitchCount50 += 1;
      if (deltaMs > longestHitchMs) {
        longestHitchMs = deltaMs;
      }
      if (deltaMs >= SEVERE_HITCH_THRESHOLD_MS) {
        hitchCount100 += 1;
      }
      if (activeLoadKind !== 'none') {
        hitchWhileLoading += 1;
      }

      logClientEvent('frame_hitch', {
        deltaMs: Math.round(deltaMs),
        load: activeLoadKind,
      });
    },

    reset() {
      frameCount = 0;
      hitchCount50 = 0;
      hitchCount100 = 0;
      longestHitchMs = 0;
      hitchWhileLoading = 0;
      lastFrameAt = performance.now();
    },

    stats() {
      const sampleCount = Math.min(frameCount, BUFFER_SIZE);
      const samples = [];
      for (let i = 0; i < sampleCount; i += 1) {
        const value = frameMs[i];
        if (Number.isFinite(value)) {
          samples.push(value);
        }
      }
      samples.sort((a, b) => a - b);
      return {
        samples: sampleCount,
        p50FrameMs: Math.round(percentile(samples, 0.5) * 10) / 10,
        p95FrameMs: Math.round(percentile(samples, 0.95) * 10) / 10,
        p99FrameMs: Math.round(percentile(samples, 0.99) * 10) / 10,
        maxFrameMs: Math.round((samples.length > 0 ? samples[samples.length - 1] : 0) * 10) / 10,
        hitchCount50,
        hitchCount100,
        longestHitchMs: Math.round(longestHitchMs * 10) / 10,
        hitchWhileLoading,
        activeLoadKind,
      };
    },
  };
}
