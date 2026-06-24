import {
  applyLightingEnvironment,
  applyLightingToObject,
  lightingOptionsFromInputs,
  updateTreeShadeObject,
} from './lighting.ts';
import { updateMapBackdropLighting } from '../tile-map/map-backdrop.ts';
import { fogRangeFromControls } from '../common/view-preferences.ts';
import { setFogOptions } from './postprocessing.ts';
import {
  lightingRig,
  loadedChunks,
  postProcessing,
  renderer,
  runtime,
  scene,
  NOON_LIGHTING_TIME,
} from './scene-context.ts';
import { readFloatControl } from '../ui/control-readers.ts';
import {
  fogEnabledInput,
  fogFarValueInput,
  fogHorizonValueInput,
  fogNearValueInput,
  fogStrengthValueInput,
  mapTimeInput,
  shadeDarknessValueInput,
  shadeSizeValueInput,
  treeShadeInput,
} from '../ui/dom.ts';

export function fogControlRange() {
  return fogRangeFromControls(fogNearValueInput, fogFarValueInput);
}

export function currentLightingOptions() {
  return lightingOptionsFromInputs({
    treeShadeInput,
    shadeSizeInput: shadeSizeValueInput,
    shadeDarknessInput: shadeDarknessValueInput,
    time: mapTimeInput.checked ? runtime.worldTime : NOON_LIGHTING_TIME,
    fogRange: fogControlRange(),
  });
}

export function fogControlOptions() {
  const range = fogControlRange();
  return {
    enabled: fogEnabledInput.checked,
    near: range.near,
    far: range.far,
    strength: readFloatControl(fogStrengthValueInput, 0.9),
    horizonStrength: readFloatControl(fogHorizonValueInput, 0.65),
    color: scene.userData.terrascapeFog?.color ?? scene.background,
  };
}

export function applyFogSettings() {
  const options = fogControlOptions();
  scene.fog = null;
  setFogOptions(postProcessing, options);
}

export function updateMapDistanceFog() {
  scene.fog = null;
}

export function applyLighting() {
  const options = currentLightingOptions();
  applyLightingEnvironment(scene, renderer, lightingRig, options);
  updateMapBackdropLighting(options);
  applyFogSettings();
  for (const entry of loadedChunks.values()) {
    applyLightingToObject(entry.object, options);
    updateTreeShadeObject(entry.shade, options);
  }
}
