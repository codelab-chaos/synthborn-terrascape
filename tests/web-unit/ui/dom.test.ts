import assert from 'node:assert/strict';
import test from 'node:test';

import * as dom from '../../../src/main/resources/web/src/ui/dom.ts';

test('dom module exports resolve every scaffold element (non-null)', () => {
  for (const [name, value] of Object.entries(dom)) {
    assert.ok(value, `expected dom.${name} to be a non-null element`);
  }
});

test('dom exports point at the expected ids/classes', () => {
  assert.equal(dom.canvas.id, 'scene');
  assert.equal(dom.worldSelect.id, 'world');
  assert.equal(dom.radiusInput.id, 'radius');
  assert.equal(dom.statusEl.id, 'status');
  assert.ok(dom.hudEl.classList.contains('hud'));
  assert.ok(dom.infoCardEl.classList.contains('info-card'));
});
