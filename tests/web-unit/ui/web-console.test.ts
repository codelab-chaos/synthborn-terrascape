import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isWebConsoleShortcut,
  mountWebConsole,
  resetWebConsoleForTests,
} from '../../../web/src/ui/web-console.ts';

function mountScaffold() {
  document.querySelector('#web-console')?.remove();
  document.querySelector('.titlebar-actions')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="titlebar-actions"></div>
    <section id="web-console" hidden aria-hidden="true">
      <b id="web-console-identity"></b>
      <span id="web-console-status"></span>
      <button id="web-console-close" type="button"></button>
      <div id="web-console-history"></div>
      <form id="web-console-form"><input id="web-console-input"><button type="submit"></button></form>
    </section>
  `);
}

function cleanup() {
  resetWebConsoleForTests();
  document.querySelector('#web-console')?.remove();
  document.querySelector('.titlebar-actions')?.remove();
  sessionStorage.clear();
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('T opens console outside editable controls', () => {
  assert.equal(isWebConsoleShortcut(new KeyboardEvent('keydown', { code: 'KeyT' })), true);
  assert.equal(isWebConsoleShortcut(new KeyboardEvent('keydown', { code: 'KeyT', ctrlKey: true })), false);
  const input = document.createElement('input');
  assert.equal(isWebConsoleShortcut(new KeyboardEvent('keydown', { code: 'KeyT' })), true);
  const typing = new KeyboardEvent('keydown', { code: 'KeyT' });
  Object.defineProperty(typing, 'target', { value: input });
  assert.equal(isWebConsoleShortcut(typing), false);
});

test('identified session mounts and T/Escape control the console', async () => {
  resetWebConsoleForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    if (String(input).includes('/history')) {
      return { ok: true, status: 200, json: async () => ({ entries: [] }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        enabled: true,
        authenticated: true,
        online: false,
        player: { uuid: 'f9be85cb-a003-4d84-baae-f81662b04be0', username: 'Aster' },
      }),
    };
  }) as any;
  mountScaffold();
  try {
    assert.equal(await mountWebConsole(), true);
    assert.equal(document.querySelector('.web-console-toggle')?.textContent, 'Chat');
    assert.equal(document.querySelector('#web-console-status')?.textContent, 'Connected');

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));
    const panel = document.querySelector<HTMLElement>('#web-console')!;
    const input = document.querySelector<HTMLInputElement>('#web-console-input')!;
    assert.equal(panel.hidden, false);
    assert.equal(document.activeElement, input);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    assert.equal(panel.hidden, true);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('anonymous or disabled session does not mount a chat toggle', async () => {
  const originalFetch = globalThis.fetch;
  resetWebConsoleForTests();
  mountScaffold();
  try {
    globalThis.fetch = (async () => ({
      ok: true, status: 200, json: async () => ({ ok: true, enabled: false }),
    })) as any;
    assert.equal(await mountWebConsole(), false);
    assert.equal(document.querySelector('.web-console-toggle'), null);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('open renders history safely and successful submit clears the prompt', async () => {
  const originalFetch = globalThis.fetch;
  resetWebConsoleForTests();
  mountScaffold();
  let historyCalls = 0;
  let submittedBody = '';
  try {
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.includes('/session')) {
        return { ok: true, status: 200, json: async () => ({
          ok: true, enabled: true, authenticated: true,
          player: { uuid: 'f9be85cb-a003-4d84-baae-f81662b04be0', username: 'Aster' },
        }) };
      }
      if (url.includes('/history')) {
        historyCalls += 1;
        return { ok: true, status: 200, json: async () => ({ entries: historyCalls === 1 ? [{
          id: 1, timestamp: 1_700_000_000_000, kind: 'chat', username: '<b>Aster</b>',
          content: '<script>bad()</script>',
        }] : [] }) };
      }
      submittedBody = String(init?.body ?? '');
      return { ok: true, status: 200 };
    }) as any;

    assert.equal(await mountWebConsole(), true);
    document.querySelector<HTMLButtonElement>('.web-console-toggle')!.click();
    await tick();
    assert.equal(document.querySelector('#web-console-history strong')?.textContent, '<b>Aster</b>');
    assert.equal(document.querySelector('#web-console-history span')?.textContent, '<script>bad()</script>');
    assert.equal(document.querySelector('#web-console-history script'), null);

    const input = document.querySelector<HTMLInputElement>('#web-console-input')!;
    input.value = ' hello ';
    document.querySelector<HTMLFormElement>('#web-console-form')!
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await tick();
    await tick();
    assert.equal(submittedBody, JSON.stringify({ input: 'hello' }));
    assert.equal(input.value, '');
    assert.equal(input.disabled, false);
    assert.equal(document.querySelector('#web-console-status')?.textContent, 'Connected');
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test('submit errors remain visible and panel size survives a remount', async () => {
  const originalFetch = globalThis.fetch;
  resetWebConsoleForTests();
  mountScaffold();
  try {
    globalThis.fetch = (async (input) => {
      if (String(input).includes('/session')) {
        return { ok: true, status: 200, json: async () => ({
          ok: true, enabled: true, authenticated: true,
          player: { uuid: 'f9be85cb-a003-4d84-baae-f81662b04be0', username: 'Aster' },
        }) };
      }
      if (String(input).includes('/history')) {
        return { ok: true, status: 200, json: async () => ({ entries: [] }) };
      }
      return { ok: false, status: 429, json: async () => ({ message: 'Please wait.' }) };
    }) as any;

    assert.equal(await mountWebConsole(), true);
    const panel = document.querySelector<HTMLElement>('#web-console')!;
    Object.defineProperty(panel, 'offsetWidth', { value: 640, configurable: true });
    Object.defineProperty(panel, 'offsetHeight', { value: 360, configurable: true });
    panel.dispatchEvent(new PointerEvent('pointerup'));
    assert.deepEqual(JSON.parse(sessionStorage.getItem('terrascape.webConsoleSize')!), {
      width: 640, height: 360,
    });

    document.querySelector<HTMLButtonElement>('.web-console-toggle')!.click();
    const input = document.querySelector<HTMLInputElement>('#web-console-input')!;
    input.value = '/denied';
    document.querySelector<HTMLFormElement>('#web-console-form')!
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await tick();
    await tick();
    assert.equal(document.querySelector('#web-console-status')?.textContent, 'Please wait.');
    assert.equal(document.querySelector('#web-console-status')?.classList.contains('error'), true);
    assert.equal(input.disabled, false);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
