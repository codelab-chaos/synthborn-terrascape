import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { createChunkDebug } from '../../../src/main/resources/web/src/terrain/chunk-debug.ts';

test('createChunkDebug builds a named group with bounds lines and a label', () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
  mesh.position.set(0, 110, 0);

  const group = createChunkDebug(4, -3, mesh);
  assert.ok(group instanceof THREE.Group);
  assert.equal(group.name, 'debug:4:-3');

  const lines = group.children.find((c) => c instanceof THREE.LineSegments) as THREE.LineSegments;
  assert.ok(lines);
  assert.equal(lines.renderOrder, 20);
  // 24 edge index entries => 24 vertices * 3 components.
  const positions = lines.geometry.getAttribute('position');
  assert.equal(positions.count, 24);

  const label = group.children.find((c) => c.name === 'debug-corner-label') as THREE.Mesh;
  assert.ok(label);
  assert.equal(label.renderOrder, 21);
  assert.equal(label.rotation.x, -Math.PI / 2);

  // Label material carries a CanvasTexture map.
  const material = label.material as THREE.MeshBasicMaterial;
  assert.ok(material.map instanceof THREE.CanvasTexture);
  assert.equal(material.map.colorSpace, THREE.SRGBColorSpace);
});

test('createChunkDebug falls back to default bounds for an empty object', () => {
  // An empty group has non-finite Box3 bounds; the fallback Y values kick in.
  const empty = new THREE.Group();
  const group = createChunkDebug(0, 0, empty);
  assert.ok(group instanceof THREE.Group);
  assert.equal(group.name, 'debug:0:0');

  const lines = group.children.find((c) => c instanceof THREE.LineSegments) as THREE.LineSegments;
  const positions = lines.geometry.getAttribute('position') as THREE.BufferAttribute;
  // All Y values must be finite (proves the fallback minY=100/maxY=132 path ran).
  for (let i = 0; i < positions.count; i += 1) {
    assert.ok(Number.isFinite(positions.getY(i)));
  }
});
