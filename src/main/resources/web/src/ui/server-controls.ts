import {
  autoStreamInput,
  mapTilesInput,
  mobUpdateRateInput,
  playerUpdateRateInput,
  radiusInput,
  showMobsInput,
  showPlayersInput,
  terrainLoadSlotsInput,
  terrainLoadSlotsValueInput,
  terrainSpawnBudgetInput,
  terrainSpawnBudgetValueInput,
  terrainSpawnFrameInput,
  terrainSpawnFrameValueInput,
} from './dom.ts';
import { radiusValue, setRadiusControlValue } from './control-readers.ts';

// Shape published by the server under `clientControls` in /api/worlds.
interface RangeSpec {
  enabled?: boolean;
  options?: number[];
  default?: number;
}

interface ClientControls {
  showMobs?: boolean;
  showPlayers?: boolean;
  mapTiles?: boolean;
  autoStream?: boolean;
  mobUpdateRate?: RangeSpec;
  playerUpdateRate?: RangeSpec;
  chunksLoadedAtOnce?: RangeSpec;
  spawnPerFrame?: RangeSpec;
  spawnBudgetMs?: RangeSpec;
  streamRadius?: RangeSpec;
}

const numericOptions = (spec: RangeSpec | undefined): number[] =>
  spec?.options?.filter((value) => Number.isFinite(value)) ?? [];

// A disabled toggle is greyed out (kept visible) and forced off so it issues no requests.
function applyToggle(input: HTMLInputElement | null, enabled: boolean | undefined) {
  if (!input || enabled === undefined) return;
  if (!enabled) input.checked = false;
  input.disabled = !enabled;
}

// Rebuilds a per-second rate dropdown from server options (values stored as ms, labelled /sec).
function applyRateSelect(select: HTMLSelectElement | null, spec: RangeSpec | undefined) {
  if (!select || !spec) return;
  const options = numericOptions(spec).filter((value) => value > 0);
  if (options.length) {
    const previous = select.value;
    const toMs = (perSecond: number) => String(Math.round(1000 / perSecond));
    select.replaceChildren();
    for (const perSecond of options) {
      const option = document.createElement('option');
      option.value = toMs(perSecond);
      option.textContent = `${perSecond}/sec`;
      select.append(option);
    }
    const allowed = options.map(toMs);
    const fallback = spec.default != null ? toMs(spec.default) : allowed[0];
    select.value = allowed.includes(previous) ? previous : fallback;
  }
  if (spec.enabled === false) select.disabled = true;
}

// Applies a numeric control to its slider + number pair: options bound the range, out-of-range
// values clamp in, and a disabled control greys out (kept visible) and snaps to the default.
function applyRangeControl(
  rangeEl: HTMLInputElement | null,
  numberEl: HTMLInputElement | null,
  spec: RangeSpec | undefined,
) {
  if (!spec || !rangeEl || !numberEl) return;
  const options = numericOptions(spec);
  const inputs = [rangeEl, numberEl];
  if (options.length) {
    const min = Math.min(...options);
    const max = Math.max(...options);
    const current = Number(numberEl.value);
    const clamped = Math.min(max, Math.max(min, Number.isFinite(current) ? current : (spec.default ?? min)));
    for (const input of inputs) {
      input.min = String(min);
      input.max = String(max);
      input.value = String(clamped);
    }
  }
  const disabled = spec.enabled === false;
  for (const input of inputs) input.disabled = disabled;
  if (disabled && spec.default != null) {
    for (const input of inputs) input.value = String(spec.default);
  }
}

// Stream radius uses the canonical radius setter so its readout stays in sync.
function applyRadius(spec: RangeSpec | undefined) {
  if (!spec || !radiusInput) return;
  const options = numericOptions(spec);
  if (options.length) {
    const min = Math.min(...options);
    const max = Math.max(...options);
    radiusInput.min = String(min);
    radiusInput.max = String(max);
    const current = radiusValue();
    const target = Number.isFinite(current) ? current : (spec.default ?? min);
    setRadiusControlValue(Math.min(max, Math.max(min, target)));
  } else if (spec.default != null) {
    setRadiusControlValue(spec.default);
  }
  if (spec.enabled === false) radiusInput.disabled = true;
}

export function applyServerControls(controls: ClientControls | undefined) {
  if (!controls) return;
  applyToggle(showMobsInput, controls.showMobs);
  applyToggle(showPlayersInput, controls.showPlayers);
  applyToggle(mapTilesInput, controls.mapTiles);
  applyToggle(autoStreamInput, controls.autoStream);
  applyRateSelect(mobUpdateRateInput, controls.mobUpdateRate);
  applyRateSelect(playerUpdateRateInput, controls.playerUpdateRate);
  applyRangeControl(terrainLoadSlotsInput, terrainLoadSlotsValueInput, controls.chunksLoadedAtOnce);
  applyRangeControl(terrainSpawnFrameInput, terrainSpawnFrameValueInput, controls.spawnPerFrame);
  applyRangeControl(terrainSpawnBudgetInput, terrainSpawnBudgetValueInput, controls.spawnBudgetMs);
  applyRadius(controls.streamRadius);
}
