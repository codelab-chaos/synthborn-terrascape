import assert from 'node:assert/strict';
import test from 'node:test';

import { confirmAction } from '../../../web/src/library/confirm-dialog.ts';

// The test scaffold does not inject the #confirm-dialog markup, so the module's
// captured dialog elements are null and confirmAction falls back to window.confirm.
// We exercise that fallback path here (the native <dialog> path requires the markup
// to exist at module import time, which the harness does not provide).

test('confirmAction falls back to window.confirm using the message', async () => {
  const original = (window as any).confirm;
  const seen: string[] = [];
  (window as any).confirm = (text: string) => {
    seen.push(text);
    return true;
  };
  try {
    const result = await confirmAction({ message: 'Delete world?', title: 'Danger' });
    assert.equal(result, true);
    assert.equal(seen[0], 'Delete world?');
  } finally {
    (window as any).confirm = original;
  }
});

test('confirmAction falls back to the title when no message is given', async () => {
  const original = (window as any).confirm;
  let prompted = '';
  (window as any).confirm = (text: string) => { prompted = text; return false; };
  try {
    const result = await confirmAction({ title: 'Proceed?' });
    assert.equal(result, false);
    assert.equal(prompted, 'Proceed?');
  } finally {
    (window as any).confirm = original;
  }
});

test('confirmAction defaults the prompt text with no options', async () => {
  const original = (window as any).confirm;
  let prompted = '';
  (window as any).confirm = (text: string) => { prompted = text; return true; };
  try {
    const result = await confirmAction();
    assert.equal(result, true);
    assert.equal(prompted, 'Continue?');
  } finally {
    (window as any).confirm = original;
  }
});
