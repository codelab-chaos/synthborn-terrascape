import * as THREE from 'three';

const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 72;
const UPDATE_INTERVAL_SECONDS = 0.25;
const MARGIN_PX = 18;
const DISPLAY_WIDTH_PX = 128;
const DISPLAY_HEIGHT_PX = 36;

export function createFpsCounter(scene, camera, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 10000;
  camera.add(sprite);
  scene.add(camera);

  const counter = {
    canvas,
    context,
    camera,
    renderer,
    sprite,
    texture,
    frames: 0,
    elapsed: 0,
    fps: 0,
    frameMs: 0,
  };

  drawCounter(counter);
  positionFpsCounter(counter);
  return counter;
}

export function updateFpsCounter(counter, deltaSeconds) {
  counter.frames++;
  counter.elapsed += deltaSeconds;
  if (counter.elapsed < UPDATE_INTERVAL_SECONDS) {
    return;
  }

  counter.fps = counter.frames / counter.elapsed;
  counter.frameMs = counter.elapsed * 1000 / counter.frames;
  counter.frames = 0;
  counter.elapsed = 0;
  drawCounter(counter);
}

export function positionFpsCounter(counter) {
  const size = counter.renderer.getSize(new THREE.Vector2());
  const distance = 1;
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(counter.camera.fov) / 2) * distance;
  const visibleWidth = visibleHeight * counter.camera.aspect;
  const worldPerPixel = visibleHeight / Math.max(1, size.y);
  const width = DISPLAY_WIDTH_PX * worldPerPixel;
  const height = DISPLAY_HEIGHT_PX * worldPerPixel;
  const margin = MARGIN_PX * worldPerPixel;

  counter.sprite.scale.set(width, height, 1);
  counter.sprite.position.set(
    visibleWidth / 2 - width / 2 - margin,
    visibleHeight / 2 - height / 2 - margin,
    -distance);
}

function drawCounter(counter) {
  const { context } = counter;
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = 'rgba(5, 12, 18, 0.76)';
  roundRect(context, 4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8, 10);
  context.fill();

  context.strokeStyle = 'rgba(135, 220, 184, 0.45)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#83e1bd';
  context.font = '700 24px system-ui, sans-serif';
  context.textBaseline = 'middle';
  context.fillText('FPS', 20, 30);

  context.fillStyle = '#f4fff9';
  context.font = '700 28px system-ui, sans-serif';
  context.textAlign = 'right';
  context.fillText(Math.round(counter.fps).toString(), 232, 30);

  context.fillStyle = 'rgba(221, 238, 231, 0.78)';
  context.font = '600 14px system-ui, sans-serif';
  context.fillText(`${counter.frameMs.toFixed(1)} ms`, 232, 54);
  context.textAlign = 'left';

  counter.texture.needsUpdate = true;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
