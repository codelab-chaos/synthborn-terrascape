// Shared test environment for the web unit suite.
//
// The browser-facing TypeScript under web/src reads `document`,
// `window`, `location`, `localStorage`, requestAnimationFrame, etc. at module load
// time, and the scene singletons in scene/scene-context.ts construct a
// THREE.WebGLRenderer the moment they are imported. Node has none of this, so before
// any test module loads we:
//   1. register a headless DOM (happy-dom) onto globalThis,
//   2. inject the full page scaffold the modules query in ui/dom.ts, and
//   3. give the `#scene` canvas a fake WebGL2 context so the renderer constructs.
// Wired in via `node --import ./tests/web-unit-setup.mjs`.
//
// three.js core (scene graph, math, materials) runs fine headless; only an actual
// draw call needs a real GPU, which these unit tests never trigger.
import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow({ url: 'http://localhost/' });

// Names whose Node-native implementation the suite relies on — don't let happy-dom
// shadow them.
const KEEP_NODE = new Set([
  'console', 'fetch', 'URL', 'URLSearchParams', 'structuredClone', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'process',
  'global', 'globalThis', 'Buffer', 'TextEncoder', 'TextDecoder', 'performance',
]);

for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(window))) {
  if (KEEP_NODE.has(name)) continue;
  const isDomEssential = name === 'location' || name === 'document' || name === 'navigator';
  if (name in globalThis && !isDomEssential && typeof globalThis[name] !== 'undefined') continue;
  try {
    Object.defineProperty(globalThis, name, descriptor);
  } catch {
    // Non-configurable in Node; leave Node's version in place.
  }
}

globalThis.window = window;
globalThis.self = window;

if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
window.matchMedia ??= globalThis.matchMedia;

// --- Fake WebGL2 context -----------------------------------------------------
// A Proxy where GL enum constants resolve to their own name (so getParameter can
// switch on them) and every other member is a no-op returning a benign object. Enough
// for THREE.WebGLRenderer to *construct*; real draw calls are out of scope for units.
function makeFakeGL(canvas) {
  const fns = new Map();
  const param = (name) => {
    if (/VERSION/.test(name)) return name.includes('SHADING') ? 'WebGL GLSL ES 3.00' : 'WebGL 2.0';
    if (/VENDOR|RENDERER/.test(name)) return 'mock';
    if (/MAX_|UNITS|SIZE|VECTORS|ATTRIBS|SAMPLES|BUFFERS|DRAW/.test(name)) return 16;
    return 0;
  };
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === 'canvas') return canvas;
      if (prop === 'drawingBufferWidth') return canvas.width || 800;
      if (prop === 'drawingBufferHeight') return canvas.height || 600;
      if (prop === 'getExtension') return () => null;
      if (prop === 'getParameter') return (p) => param(String(p));
      if (prop === 'getContextAttributes') return () => ({ alpha: true, antialias: true, depth: true, stencil: true });
      if (prop === 'getShaderPrecisionFormat') return () => ({ precision: 23, rangeMin: 127, rangeMax: 127 });
      if (prop === 'getProgramParameter' || prop === 'getShaderParameter') return () => true;
      if (prop === 'getProgramInfoLog' || prop === 'getShaderInfoLog') return () => '';
      if (prop === 'getActiveAttrib' || prop === 'getActiveUniform') return () => ({ name: 'a', size: 1, type: 0 });
      if (typeof prop === 'string' && /^[A-Z0-9_]+$/.test(prop)) return prop; // GL constant → own name
      if (!fns.has(prop)) fns.set(prop, () => ({}));
      return fns.get(prop);
    },
  });
}

// --- Fake 2D context ---------------------------------------------------------
// Modules paint text/gradients onto offscreen canvases to build sprite textures
// (mob cards, fps counter, time labels). happy-dom's 2D context is incomplete, so we
// supply a no-op surface whose gradient/metrics calls return well-formed objects.
function makeFakeGradient() {
  return { addColorStop() {} };
}
function makeFake2D(canvas) {
  const noop = () => {};
  return {
    canvas,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif',
    textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1, lineCap: 'butt',
    lineJoin: 'miter', shadowBlur: 0, shadowColor: '#000', globalCompositeOperation: 'source-over',
    save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, arcTo: noop, rect: noop, roundRect: noop, ellipse: noop, quadraticCurveTo: noop,
    bezierCurveTo: noop, fill: noop, stroke: noop, clip: noop, fillRect: noop, strokeRect: noop,
    clearRect: noop, fillText: noop, strokeText: noop, drawImage: noop, putImageData: noop,
    setTransform: noop, transform: noop, translate: noop, scale: noop, rotate: noop,
    setLineDash: noop, resetTransform: noop, createLinearGradient: makeFakeGradient,
    createRadialGradient: makeFakeGradient, createConicGradient: makeFakeGradient,
    createPattern: () => ({}),
    measureText: (t) => ({ width: String(t ?? '').length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    getImageData: (x, y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    createImageData: (w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
  };
}

// Route getContext: '2d' → fake 2D surface, anything else → fake GL. Covers any canvas
// a module creates, not just #scene.
const HTMLCanvasElement = globalThis.HTMLCanvasElement;
if (HTMLCanvasElement) {
  HTMLCanvasElement.prototype.getContext = function getContext(type) {
    if (!this.width) this.width = 800;
    if (!this.height) this.height = 600;
    return type === '2d' ? makeFake2D(this) : makeFakeGL(this);
  };
}

// --- Page scaffold -----------------------------------------------------------
// Every element ui/dom.ts looks up, with the tag the code expects. Derived from the
// querySelector list in web/src/ui/dom.ts.
const SCAFFOLD = [
  ['#scene', 'canvas'], ['#world', 'select'], ['#chunk-x', 'input'], ['#chunk-z', 'input'],
  ['#radius-range', 'input'], ['#radius', 'input'], ['#radius-diameter', 'div'],
  ['#auto-stream', 'input'], ['#debug-bounds', 'input'], ['#show-players', 'input'],
  ['#show-mobs', 'input'], ['#mob-blocks', 'input'], ['#mob-blocks-panel', 'input'],
  ['#player-update-rate', 'input'], ['#mob-update-rate', 'input'], ['#tree-shade', 'input'],
  ['#map-tiles', 'input'], ['#clear-mesh-cache', 'button'], ['#cosmetic-blocks-mode', 'input'],
  ['#visual-detail-mode', 'input'], ['#land-motion', 'input'], ['#terrain-load-slots', 'input'],
  ['#terrain-load-slots-value', 'input'], ['#map-tile-radius', 'input'],
  ['#map-tile-radius-value', 'input'], ['#tile-load-slots', 'input'],
  ['#tile-load-slots-value', 'input'], ['#terrain-spawn-frame', 'input'],
  ['#terrain-spawn-frame-value', 'input'], ['#terrain-spawn-budget', 'input'],
  ['#terrain-spawn-budget-value', 'input'], ['#shade-size', 'input'],
  ['#shade-size-value', 'input'], ['#shade-darkness', 'input'], ['#shade-darkness-value', 'input'],
  ['#water-mode', 'input'], ['#fog-enabled', 'input'], ['#fog-near', 'input'],
  ['#fog-near-value', 'input'], ['#fog-far', 'input'], ['#fog-far-value', 'input'],
  ['#fog-strength', 'input'], ['#fog-strength-value', 'input'], ['#fog-horizon', 'input'],
  ['#fog-horizon-value', 'input'], ['#sync-time', 'input'], ['#time-cycle-label', 'div'],
  ['#sky-scene', 'div'], ['#sky-sun', 'div'], ['#sky-moon', 'div'], ['#sky-stars', 'div'],
  ['.hud', 'div'], ['#panel-toggle', 'div'], ['#status', 'div'], ['#metric-loaded', 'div'],
  ['#metric-meshes', 'div'], ['#metric-resources', 'div'], ['#metric-gpu', 'div'],
  ['#metric-disposed', 'div'], ['#metric-mobs', 'div'], ['#metric-center', 'div'],
  ['#coord-target', 'div'], ['#coord-chunk', 'div'], ['#coord-camera', 'div'],
  ['#pos-value', 'div'], ['#players', 'div'], ['.server-card', 'div'], ['#server-card-head', 'div'],
  ['#server-cpu-value', 'div'], ['#server-memory-value', 'div'], ['#server-detail-cpu', 'div'],
  ['#server-detail-host-cpu', 'div'], ['#server-detail-memory', 'div'],
  ['#server-detail-host-memory', 'div'], ['#server-detail-threads', 'div'],
  ['#server-detail-updated', 'div'], ['.info-card', 'div'], ['#info-card-head', 'div'],
];

for (const [selector, tag] of SCAFFOLD) {
  if (window.document.querySelector(selector)) continue;
  const el = window.document.createElement(tag);
  if (selector.startsWith('#')) el.id = selector.slice(1);
  else el.className = selector.slice(1);
  if (tag === 'input') el.value = '';
  window.document.body.appendChild(el);
}
