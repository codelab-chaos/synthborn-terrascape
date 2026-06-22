import assert from 'node:assert/strict';
import test from 'node:test';

import { updateCoordinates } from '../../../src/main/resources/web/src/ui/coordinate-readout.ts';
import { camera, controls } from '../../../src/main/resources/web/src/scene/scene-context.ts';
import {
  coordCameraEl,
  coordChunkEl,
  coordTargetEl,
  posValueEl,
} from '../../../src/main/resources/web/src/ui/dom.ts';

test('updateCoordinates writes camera/target/chunk readouts from scene state', () => {
  camera.position.set(40, 122, -8);
  controls.target.set(16, 100, 16);

  updateCoordinates();

  // Camera coords appear in both the camera readout and the bracketed pos value.
  assert.ok((coordCameraEl.textContent ?? '').length > 0);
  assert.equal(posValueEl.textContent, `[${coordCameraEl.textContent}]`);
  assert.ok((coordTargetEl.textContent ?? '').includes(','));
  // Chunk readout is "chunkX, chunkZ".
  assert.match(coordChunkEl.textContent ?? '', /^-?\d+, -?\d+$/);
});
