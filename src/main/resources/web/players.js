import * as THREE from 'three';

export function createPlayerMarker(player) {
  const group = new THREE.Group();
  group.name = `player:${player.uuid}`;

  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24),
    new THREE.MeshStandardMaterial({
      color: 0x5ef1b5,
      emissive: 0x174234,
      roughness: 0.45,
    }),
  );
  ring.position.y = -1.75;
  group.add(ring);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 1.15, 4, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfff1a8,
      emissive: 0x4c3714,
      roughness: 0.65,
    }),
  );
  body.position.y = -0.75;
  group.add(body);

  const heading = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.72, 16),
    new THREE.MeshStandardMaterial({
      color: 0x72c7ff,
      emissive: 0x153a5a,
      roughness: 0.5,
    }),
  );
  heading.position.set(0, -0.7, -0.82);
  heading.rotation.x = Math.PI * 0.5;
  group.add(heading);

  return group;
}

export function disposeObject(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  });
}
