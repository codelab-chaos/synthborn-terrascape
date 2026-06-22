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
  mapTileRadiusInput,
  mapTileRadiusValueInput,
  tileLoadSlotsInput,
  tileLoadSlotsValueInput,
} from './dom.ts';
import { radiusValue, setRadiusControlValue, tileLoadConcurrency } from './control-readers.ts';
import { setTileLoadConcurrency } from '../tile-map/map-backdrop.ts';

// Shape published by the server under `clientControls` in /api/worlds.
interface RangeSpec {
  enabled?: boolean;
  options?: number[]; // dropdowns (rates)
  min?: number; // sliders
  max?: number; // sliders
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
  mapTileRadius?: RangeSpec;
  tilesLoadedAtOnce?: RangeSpec;
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
function sliderBounds(spec: RangeSpec): { min: number; max: number } | null {
  if (Number.isFinite(spec.min) && Number.isFinite(spec.max)) {
    return { min: spec.min as number, max: spec.max as number };
  }
  const options = numericOptions(spec);
  return options.length ? { min: Math.min(...options), max: Math.max(...options) } : null;
}

function applyRangeControl(
  rangeEl: HTMLInputElement | null,
  numberEl: HTMLInputElement | null,
  spec: RangeSpec | undefined,
) {
  if (!spec || !rangeEl || !numberEl) return;
  const bounds = sliderBounds(spec);
  const inputs = [rangeEl, numberEl];
  if (bounds) {
    const { min, max } = bounds;
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
  const bounds = sliderBounds(spec);
  if (bounds) {
    const { min, max } = bounds;
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
  applyRangeControl(mapTileRadiusInput, mapTileRadiusValueInput, controls.mapTileRadius);
  applyRangeControl(tileLoadSlotsInput, tileLoadSlotsValueInput, controls.tilesLoadedAtOnce);
  setTileLoadConcurrency(tileLoadConcurrency());
}
