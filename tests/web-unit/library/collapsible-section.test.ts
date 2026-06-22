import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindHudSectionCollapsibles,
  setHudSectionCollapsed,
  collapsedSectionState,
  applyCollapsedSectionState,
} from '../../../web/src/library/collapsible-section.ts';

function makeSection(sectionId: string, collapsed = false) {
  const section = document.createElement('div');
  section.className = collapsed ? 'hud-section collapsed' : 'hud-section';
  section.setAttribute('data-section', sectionId);
  const head = document.createElement('button');
  head.className = 'hud-section-head';
  section.appendChild(head);
  document.body.appendChild(section);
  return { section, head };
}

test('bindHudSectionCollapsibles toggles a section on head click and fires onToggle', () => {
  const root = document.createElement('div');
  const { section, head } = makeSection('panel-a');
  root.appendChild(section);
  document.body.appendChild(root);

  let toggles = 0;
  bindHudSectionCollapsibles(root, () => { toggles++; });

  assert.equal(section.classList.contains('collapsed'), false);
  head.click();
  assert.equal(section.classList.contains('collapsed'), true);
  assert.equal(head.getAttribute('aria-expanded'), 'false');
  assert.equal(toggles, 1);

  head.click();
  assert.equal(section.classList.contains('collapsed'), false);
  assert.equal(head.getAttribute('aria-expanded'), 'true');
  assert.equal(toggles, 2);
});

test('bindHudSectionCollapsibles toggles on Enter and Space keydown', () => {
  const root = document.createElement('div');
  const { section, head } = makeSection('panel-b');
  root.appendChild(section);
  document.body.appendChild(root);

  bindHudSectionCollapsibles(root);

  head.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.equal(section.classList.contains('collapsed'), true);

  head.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  assert.equal(section.classList.contains('collapsed'), false);

  // An unrelated key is ignored.
  head.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
  assert.equal(section.classList.contains('collapsed'), false);
});

test('bindHudSectionCollapsibles skips heads without a parent hud-section', () => {
  const root = document.createElement('div');
  const orphan = document.createElement('button');
  orphan.className = 'hud-section-head';
  root.appendChild(orphan);
  document.body.appendChild(root);
  // Should not throw despite missing .hud-section ancestor.
  bindHudSectionCollapsibles(root);
  assert.ok(true);
});

test('setHudSectionCollapsed flips collapsed state by data-section id', () => {
  const { section, head } = makeSection('panel-c');
  setHudSectionCollapsed('panel-c', true);
  assert.equal(section.classList.contains('collapsed'), true);
  assert.equal(head.getAttribute('aria-expanded'), 'false');

  setHudSectionCollapsed('panel-c', false);
  assert.equal(section.classList.contains('collapsed'), false);
  assert.equal(head.getAttribute('aria-expanded'), 'true');
});

test('setHudSectionCollapsed is a no-op for unknown sections', () => {
  setHudSectionCollapsed('does-not-exist', true); // no throw
  assert.ok(true);
});

test('collapsedSectionState reads collapsed flags for identifiable sections', () => {
  const root = document.createElement('div');
  const a = document.createElement('div');
  a.className = 'hud-section collapsed';
  a.setAttribute('data-section', 'sx');
  const b = document.createElement('div');
  b.className = 'hud-section';
  b.setAttribute('data-section', 'sy');
  root.appendChild(a);
  root.appendChild(b);
  document.body.appendChild(root);

  const state = collapsedSectionState(root);
  assert.equal(state.sx, true);
  assert.equal(state.sy, false);
});

test('applyCollapsedSectionState restores collapse state from a map', () => {
  const { section: secD } = makeSection('panel-d', false);
  const { section: secE } = makeSection('panel-e', true);
  applyCollapsedSectionState({ 'panel-d': true, 'panel-e': false });
  assert.equal(secD.classList.contains('collapsed'), true);
  assert.equal(secE.classList.contains('collapsed'), false);
});

test('applyCollapsedSectionState ignores non-boolean entries and bad input', () => {
  const { section } = makeSection('panel-f', false);
  applyCollapsedSectionState({ 'panel-f': 'yes' as any });
  assert.equal(section.classList.contains('collapsed'), false);
  applyCollapsedSectionState(null);
  applyCollapsedSectionState(undefined);
  applyCollapsedSectionState('nope' as any);
  assert.ok(true);
});
