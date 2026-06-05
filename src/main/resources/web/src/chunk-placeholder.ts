import * as THREE from 'three';
import { chunkId } from './utils.js';

const CHUNK_SIZE = 32;
const PLACEHOLDER_BASE_Y = 96;
const PLACEHOLDER_HEIGHT = 32;
const PLACEHOLDER_FADE_MS = 220;
const FACE_GRID_LINES = 3;
const PLACEHOLDER_AXIS_COLOR = 0x1faa6a;
const PLACEHOLDER_LINE_COLOR = 0x15965a;

type PlaceholderEntry = {
  object: THREE.Group;
  lineMaterial: THREE.LineBasicMaterial;
  state: 'waiting' | 'fading';
  fadeElapsed: number;
};

function createFaceGridGeometry(size: number, height: number, lineCount: number) {
  const positions: number[] = [];
  const step = size / (lineCount + 1);

  const addSegment = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
    positions.push(ax, ay, az, bx, by, bz);
  };

  for (let i = 1; i <= lineCount; i += 1) {
    const offset = step * i;
    addSegment(0, 0, offset, size, 0, offset);
    addSegment(0, height, offset, size, height, offset);
    addSegment(0, 0, offset, 0, height, offset);
    addSegment(size, 0, offset, size, height, offset);

    addSegment(0, offset, 0, size, offset, 0);
    addSegment(0, offset, size, size, offset, size);
    addSegment(0, offset, 0, 0, offset, size);
    addSegment(size, offset, 0, size, offset, size);

    addSegment(offset, 0, 0, offset, 0, size);
    addSegment(offset, height, 0, offset, height, size);
    addSegment(offset, 0, 0, offset, height, 0);
    addSegment(offset, 0, size, offset, height, size);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export function createChunkPlaceholderManager(scene: THREE.Scene) {
  const placeholders = new Map<string, PlaceholderEntry>();

  function createPlaceholderObject(): PlaceholderEntry {
    const group = new THREE.Group();
    group.name = 'chunk-placeholder';

    const box = new THREE.BoxGeometry(CHUNK_SIZE, PLACEHOLDER_HEIGHT, CHUNK_SIZE);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();

    const lineMaterial = new THREE.LineBasicMaterial({
      color: PLACEHOLDER_AXIS_COLOR,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    const edgeLines = new THREE.LineSegments(edges, lineMaterial);
    edgeLines.renderOrder = -12;
    group.add(edgeLines);

    const faceGrid = new THREE.LineSegments(
      createFaceGridGeometry(CHUNK_SIZE, PLACEHOLDER_HEIGHT, FACE_GRID_LINES),
      new THREE.LineBasicMaterial({
        color: PLACEHOLDER_LINE_COLOR,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
      }),
    );
    faceGrid.renderOrder = -11;
    group.add(faceGrid);

    return {
      object: group,
      lineMaterial,
      state: 'waiting',
      fadeElapsed: 0,
    };
  }

  function disposeEntry(entry: PlaceholderEntry) {
    scene.remove(entry.object);
    entry.object.traverse((child) => {
      child.geometry?.dispose();
      const materials = child instanceof THREE.LineSegments
        ? (Array.isArray(child.material) ? child.material : [child.material])
        : [];
      for (const material of materials) {
        material?.dispose();
      }
    });
    entry.lineMaterial.dispose();
  }

  return {
    sync(world: string, keys: Array<{ chunkX: number; chunkZ: number; id: string }>, loadedIds: Set<string>) {
      const keep = new Set<string>();
      for (const key of keys) {
        const id = key.id ?? chunkId(world, key.chunkX, key.chunkZ);
        keep.add(id);
        if (loadedIds.has(id)) {
          continue;
        }
        let entry = placeholders.get(id);
        if (!entry) {
          entry = createPlaceholderObject();
          entry.object.position.set(
            key.chunkX * CHUNK_SIZE,
            PLACEHOLDER_BASE_Y,
            key.chunkZ * CHUNK_SIZE,
          );
          placeholders.set(id, entry);
          scene.add(entry.object);
        } else if (entry.state === 'waiting') {
          entry.object.position.set(
            key.chunkX * CHUNK_SIZE,
            PLACEHOLDER_BASE_Y,
            key.chunkZ * CHUNK_SIZE,
          );
          entry.object.visible = true;
        }
      }

      for (const [id, entry] of placeholders) {
        if (!keep.has(id) && entry.state === 'waiting') {
          disposeEntry(entry);
          placeholders.delete(id);
        }
      }
    },

    resolve(world: string, chunkX: number, chunkZ: number) {
      const id = chunkId(world, chunkX, chunkZ);
      const entry = placeholders.get(id);
      if (!entry || entry.state === 'fading') {
        return;
      }
      entry.state = 'fading';
      entry.fadeElapsed = 0;
    },

    update(deltaSeconds: number) {
      const completed: string[] = [];
      for (const [id, entry] of placeholders) {
        if (entry.state !== 'fading') {
          continue;
        }
        entry.fadeElapsed += deltaSeconds * 1000;
        const progress = Math.min(1, entry.fadeElapsed / PLACEHOLDER_FADE_MS);
        const edgeOpacity = 0.72 * (1 - progress);
        entry.lineMaterial.opacity = edgeOpacity;
        entry.object.traverse((child) => {
          if (!(child instanceof THREE.LineSegments) || child.material === entry.lineMaterial) {
            return;
          }
          const material = child.material as THREE.LineBasicMaterial;
          material.opacity = 0.46 * (1 - progress);
        });
        if (progress >= 1) {
          completed.push(id);
        }
      }
      for (const id of completed) {
        const entry = placeholders.get(id);
        if (!entry) continue;
        disposeEntry(entry);
        placeholders.delete(id);
      }
    },

    count() {
      return placeholders.size;
    },

    waitingCount() {
      let count = 0;
      for (const entry of placeholders.values()) {
        if (entry.state === 'waiting') count += 1;
      }
      return count;
    },
  };
}
