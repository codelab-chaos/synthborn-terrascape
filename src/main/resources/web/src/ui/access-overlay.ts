// Full-screen "access expired" overlay, shown when the server rejects a request with HTTP 401 in
// restricted mode. Reveals the markup already present in index.html and wires its reload button.

let bound = false;

export function bindAccessOverlay() {
  if (bound) return;
  bound = true;
  const reload = document.getElementById('access-overlay-reload');
  if (reload) {
    reload.addEventListener('click', () => window.location.reload());
  }
}

export function showAccessRequired() {
  const overlay = document.getElementById('access-overlay');
  if (overlay) {
    overlay.hidden = false;
  }
}
