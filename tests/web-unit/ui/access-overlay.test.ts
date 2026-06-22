import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindAccessOverlay,
  showAccessRequired,
} from '../../../src/main/resources/web/src/ui/access-overlay.ts';

test('bindAccessOverlay wires the reload button and showAccessRequired reveals the overlay', () => {
  // Build the markup the module reaches for.
  const overlay = document.createElement('div');
  overlay.id = 'access-overlay';
  overlay.hidden = true;
  const reload = document.createElement('button');
  reload.id = 'access-overlay-reload';
  overlay.appendChild(reload);
  document.body.appendChild(overlay);

  let reloaded = 0;
  const originalReload = window.location.reload;
  // location.reload is not implemented in happy-dom; stub it.
  Object.defineProperty(window.location, 'reload', {
    configurable: true,
    value: () => { reloaded++; },
  });

  try {
    bindAccessOverlay();
    // Second call is a no-op (already bound) and must not throw.
    bindAccessOverlay();

    reload.dispatchEvent(new window.Event('click'));
    assert.equal(reloaded, 1);

    assert.equal(overlay.hidden, true);
    showAccessRequired();
    assert.equal(overlay.hidden, false);
  } finally {
    if (originalReload) {
      Object.defineProperty(window.location, 'reload', { configurable: true, value: originalReload });
    }
  }
});

test('showAccessRequired is a no-op when no overlay element exists', () => {
  const existing = document.getElementById('access-overlay');
  if (existing) existing.remove();
  assert.doesNotThrow(() => showAccessRequired());
});
