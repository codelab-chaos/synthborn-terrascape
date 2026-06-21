// Central wrapper for server API calls. Its one job beyond plain fetch is to notice when the
// session is no longer authorized (HTTP 401, e.g. the access token's TTL lapsed mid-session) and
// surface that once, so the viewer can tell the user to get a fresh link instead of silently
// breaking. The credential itself rides automatically on the same-origin session cookie; callers
// keep their existing `response.ok` handling unchanged.

let unauthorizedHandler = null;
let notified = false;

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export async function apiFetch(input, init) {
  const response = await fetch(input, init);
  if (response.status === 401) {
    notifyUnauthorized();
  }
  return response;
}

function notifyUnauthorized() {
  if (notified) return;
  notified = true;
  if (typeof unauthorizedHandler === 'function') {
    try {
      unauthorizedHandler();
    } catch {
      // A failing handler must never mask the original request failure.
    }
  }
}
