import { positionFpsCounter } from '../ui/fps-counter.ts';
import { resizePostProcessing } from './postprocessing.ts';
import {
  camera,
  fpsCounter,
  postProcessing,
  renderer,
  rendererPixelRatio,
} from './scene-context.ts';

export function resizeViewport() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  resizePostProcessing(postProcessing, width, height, rendererPixelRatio);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  positionFpsCounter(fpsCounter);
}
