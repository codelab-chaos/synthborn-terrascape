import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import {
  currentMapAccessLink,
  mountAccessLinkButton,
  promoteAccessKeyFromUrl,
} from '../../../web/src/ui/access-link.ts';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.sessionStorage.clear();
  document.querySelectorAll('.access-link-button').forEach((element) => element.remove());
  document.querySelectorAll('.titlebar-actions').forEach((element) => element.remove());
});

test('promoteAccessKeyFromUrl stores the key and scrubs it from the visible URL', () => {
  window.history.replaceState(null, '', '/map?world=default&key=abc123#spawn');

  const key = promoteAccessKeyFromUrl();

  assert.equal(key, 'abc123');
  assert.equal(window.location.href, 'http://localhost/map?world=default#spawn');
  assert.equal(currentMapAccessLink(), 'http://localhost/map?world=default&key=abc123#spawn');
});

test('mountAccessLinkButton copies the hidden map access link', async () => {
  window.history.replaceState(null, '', '/map?key=stream-secret');
  promoteAccessKeyFromUrl();
  window.history.replaceState(null, '', '/map?world=live');

  let copied: string | null = null;
  const originalClipboard = (navigator as any).clipboard;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text: string) => { copied = text; } },
  });

  try {
    const button = mountAccessLinkButton();

    assert.ok(button, 'button is mounted when a key was captured');
    assert.equal(button.textContent, 'Copy link');

    button.dispatchEvent(new window.Event('click'));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    assert.equal(copied, 'http://localhost/map?world=live&key=stream-secret');
    assert.equal(button.textContent, 'Copied');
  } finally {
    if (originalClipboard !== undefined) {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    } else {
      delete (navigator as any).clipboard;
    }
  }
});

test('mountAccessLinkButton stays hidden when no access key was captured', () => {
  assert.equal(mountAccessLinkButton(), null);
  assert.equal(document.querySelector('.access-link-button'), null);
});
