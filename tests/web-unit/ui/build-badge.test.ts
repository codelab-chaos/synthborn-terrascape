import assert from 'node:assert/strict';
import test from 'node:test';

// __BUILD_INFO__ is normally injected by webpack DefinePlugin; provide it for the test.
// build-badge only reads it inside mountBuildBadge(), so a static import is fine.
(globalThis as any).__BUILD_INFO__ = {
  version: '1.2.3',
  channel: 'dev',
  sha: 'abc1234',
  time: '2026-06-21T15:04:00.000Z',
};

import { mountBuildBadge } from '../../../src/main/resources/web/src/ui/build-badge.ts';

test('mountBuildBadge appends a formatted badge and copies build info on click', () => {
  let copied: string | null = null;
  const originalClipboard = (navigator as any).clipboard;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text: string) => { copied = text; } },
  });

  try {
    mountBuildBadge();
    const badge = document.querySelector('.build-badge') as HTMLElement;
    assert.ok(badge, 'badge appended to body');
    // formatBuildTime renders MM-DD HH:MM from the ISO timestamp.
    assert.match(badge.textContent ?? '', /^v1\.2\.3 \[dev\] · abc1234 · \d\d-\d\d \d\d:\d\d$/);
    assert.match(badge.title, /Release v1\.2\.3 \[dev\]/);

    badge.dispatchEvent(new window.Event('click'));
    assert.equal(copied, 'Terrascape v1.2.3 [dev] · abc1234 · 2026-06-21T15:04:00.000Z');
  } finally {
    if (originalClipboard !== undefined) {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    }
  }
});

test('mountBuildBadge falls back to the raw string for an invalid build time', () => {
  (globalThis as any).__BUILD_INFO__ = {
    version: '0', channel: 'x', sha: 'deadbee', time: 'not-a-date',
  };
  mountBuildBadge();
  const badges = document.querySelectorAll('.build-badge');
  const last = badges[badges.length - 1] as HTMLElement;
  assert.ok((last.textContent ?? '').endsWith('not-a-date'));
});
