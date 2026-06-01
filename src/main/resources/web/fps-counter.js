const UPDATE_INTERVAL_SECONDS = 0.25;

export function createFpsCounter() {
  const counter = {
    valueEl: document.querySelector('#fps-value'),
    frameEl: document.querySelector('#fps-frame'),
    frames: 0,
    elapsed: 0,
    fps: 0,
    frameMs: 0,
  };
  drawCounter(counter);
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

// FPS is now an HTML readout on the title bar, so there is no sprite to reposition.
// Retained as a no-op so callers (resize handler, startup) keep working unchanged.
export function positionFpsCounter() {}

function drawCounter(counter) {
  if (counter.valueEl) {
    counter.valueEl.textContent = Math.round(counter.fps).toString();
  }
  if (counter.frameEl) {
    counter.frameEl.textContent = `${counter.frameMs.toFixed(1)} ms`;
  }
}
