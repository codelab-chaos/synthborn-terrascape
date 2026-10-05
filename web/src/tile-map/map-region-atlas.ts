import * as THREE from 'three';

/**
 * Stitches per-chunk map tiles into larger region planes: one mesh and one texture per
 * REGION_CHUNKS x REGION_CHUNKS block, so the flat map costs a draw call per region instead of
 * one per chunk. Tiles are drawn into the region surface as they arrive (lazy, any order); empty
 * slots stay transparent. Texture uploads are batched: `flush()` once per frame uploads only the
 * regions that changed since the last flush.
 */

export const REGION_CHUNKS = 8;
const CHUNK_SIZE = 32;
const REGION_WORLD_SIZE = REGION_CHUNKS * CHUNK_SIZE;

/** The 2D drawing surface behind a region texture; injectable so tests need no real canvas. */
export type RegionSurface = {
  readonly source: TexImageSource | OffscreenCanvas | HTMLCanvasElement;
  draw(image: CanvasImageSource, x: number, y: number, size: number): void;
  clear(x: number, y: number, size: number): void;
};

export type RegionSurfaceFactory = (pixels: number) => RegionSurface;

export type MapRegionAtlasOptions = {
  y: number;
  tilePixels?: number;
  maxAnisotropy?: number;
  createSurface?: RegionSurfaceFactory;
};

type Region = {
  key: string;
  regionX: number;
  regionZ: number;
  surface: RegionSurface;
  texture: THREE.Texture;
  mesh: THREE.Mesh;
  tiles: number;
};

export function regionCoord(chunk: number) {
  return Math.floor(chunk / REGION_CHUNKS);
}

function regionKey(regionX: number, regionZ: number) {
  return `${regionX}:${regionZ}`;
}

export function canvasRegionSurface(pixels: number): RegionSurface {
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = pixels;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable for map regions');
  context.imageSmoothingEnabled = false;
  return {
    source: canvas,
    draw(image, x, y, size) {
      context.clearRect(x, y, size, size);
      context.drawImage(image, x, y, size, size);
    },
    clear(x, y, size) {
      context.clearRect(x, y, size, size);
    },
  };
}

export function createMapRegionAtlas(scene: THREE.Scene, options: MapRegionAtlasOptions) {
  const tilePixels = options.tilePixels ?? CHUNK_SIZE;
  const regionPixels = tilePixels * REGION_CHUNKS;
  const createSurface = options.createSurface ?? canvasRegionSurface;
  const regions = new Map<string, Region>();
  const dirty = new Set<Region>();
  const tint = new THREE.Color(0xffffff);
  let y = options.y;

  function createRegion(regionX: number, regionZ: number): Region {
    const surface = createSurface(regionPixels);
    const texture = new THREE.CanvasTexture(surface.source as HTMLCanvasElement);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, options.maxAnisotropy ?? 1);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const geometry = new THREE.PlaneGeometry(REGION_WORLD_SIZE, REGION_WORLD_SIZE);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: tint,
      transparent: true,
      opacity: 0.98,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: THREE.DoubleSide,
      fog: true,
      toneMapped: false,
    });
    material.userData.terrascapeMapTile = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `map-region:${regionX}:${regionZ}`;
    mesh.position.set(regionX * REGION_WORLD_SIZE + REGION_WORLD_SIZE / 2, y, regionZ * REGION_WORLD_SIZE + REGION_WORLD_SIZE / 2);
    mesh.renderOrder = 0;
    const region = { key: regionKey(regionX, regionZ), regionX, regionZ, surface, texture, mesh, tiles: 0 };
    regions.set(region.key, region);
    scene.add(mesh);
    return region;
  }

  function disposeRegion(region: Region) {
    scene.remove(region.mesh);
    region.mesh.geometry.dispose();
    (region.mesh.material as THREE.Material).dispose();
    region.texture.dispose();
    regions.delete(region.key);
    dirty.delete(region);
  }

  /** Pixel offset of a chunk inside its region; texture row 0 is the region's north (min Z) edge. */
  function slot(chunkX: number, chunkZ: number) {
    const localX = chunkX - regionCoord(chunkX) * REGION_CHUNKS;
    const localZ = chunkZ - regionCoord(chunkZ) * REGION_CHUNKS;
    return { x: localX * tilePixels, y: localZ * tilePixels };
  }

  return {
    put(chunkX: number, chunkZ: number, image: CanvasImageSource) {
      const regionX = regionCoord(chunkX);
      const regionZ = regionCoord(chunkZ);
      const region = regions.get(regionKey(regionX, regionZ)) ?? createRegion(regionX, regionZ);
      const { x, y: py } = slot(chunkX, chunkZ);
      region.surface.draw(image, x, py, tilePixels);
      region.tiles += 1;
      dirty.add(region);
    },

    remove(chunkX: number, chunkZ: number) {
      const region = regions.get(regionKey(regionCoord(chunkX), regionCoord(chunkZ)));
      if (!region) return;
      region.tiles -= 1;
      if (region.tiles <= 0) {
        disposeRegion(region);
        return;
      }
      const { x, y: py } = slot(chunkX, chunkZ);
      region.surface.clear(x, py, tilePixels);
      dirty.add(region);
    },

    /** Upload changed regions to the GPU; call once per frame. Returns regions uploaded. */
    flush() {
      const uploaded = dirty.size;
      for (const region of dirty) region.texture.needsUpdate = true;
      dirty.clear();
      return uploaded;
    },

    meshFor(chunkX: number, chunkZ: number) {
      return regions.get(regionKey(regionCoord(chunkX), regionCoord(chunkZ)))?.mesh ?? null;
    },

    setTint(color: THREE.Color) {
      tint.copy(color);
      for (const region of regions.values()) {
        const material = region.mesh.material as THREE.MeshBasicMaterial;
        material.color.copy(tint);
      }
    },

    setY(value: number) {
      y = value;
      for (const region of regions.values()) region.mesh.position.y = y;
    },

    clear() {
      for (const region of [...regions.values()]) disposeRegion(region);
    },

    stats() {
      let tiles = 0;
      for (const region of regions.values()) tiles += region.tiles;
      return { regions: regions.size, tiles, dirty: dirty.size, regionPixels };
    },
  };
}

export type MapRegionAtlas = ReturnType<typeof createMapRegionAtlas>;
