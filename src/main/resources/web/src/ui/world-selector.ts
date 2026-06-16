import { runtime, setStatus } from '../scene/scene-context.ts';
import { worldSelect } from './dom.ts';
import { applyInitialWorldParam, applyStoredWorld } from './view-persistence.ts';

export async function loadWorlds() {
  setStatus('Loading worlds');
  const response = await fetch('/api/worlds');
  const data = await response.json();
  runtime.experimentalDetailsEnabled = data.features?.experimentalDetails === true;
  runtime.terrainFormatVersion = data.features?.terrainFormatVersion ?? runtime.terrainFormatVersion;
  worldSelect.replaceChildren();
  for (const world of data.worlds ?? []) {
    const option = document.createElement('option');
    option.value = world.name;
    option.textContent = world.name;
    worldSelect.append(option);
  }
  applyStoredWorld();
  applyInitialWorldParam();
  setStatus(worldSelect.value ? 'Ready' : 'No worlds found');
}
