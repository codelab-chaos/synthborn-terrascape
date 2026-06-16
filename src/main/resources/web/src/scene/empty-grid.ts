import { camera, grid } from './scene-context.ts';

const EMPTY_GRID_CHUNK_SNAP = 32;
const EMPTY_GRID_Y = 96;

export function updateEmptyGrid() {
  grid.position.set(
    Math.round(camera.position.x / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP,
    EMPTY_GRID_Y,
    Math.round(camera.position.z / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP,
  );
}
