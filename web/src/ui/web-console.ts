import {
  loadWebConsoleHistory,
  loadWebConsoleSession,
  submitWebConsoleInput,
  type WebConsoleEntry,
} from '../platform/web-console-api.ts';

const POLL_INTERVAL_MS = 1000;
let mounted = false;
let open = false;
let polling: number | null = null;
let lastEntryId = 0;

/** Clears module state for deterministic remounts in browser tests and hot-reload tooling. */
export function resetWebConsoleForTests(): void {
  stopPolling();
  mounted = false;
  open = false;
  lastEntryId = 0;
  window.removeEventListener('keydown', handleConsoleKeyDown, { capture: true });
  document.querySelector('.web-console-toggle')?.remove();
}

export async function mountWebConsole(): Promise<boolean> {
  if (mounted) return true;
  const panel = document.querySelector<HTMLElement>('#web-console');
  const history = document.querySelector<HTMLElement>('#web-console-history');
  const form = document.querySelector<HTMLFormElement>('#web-console-form');
  const input = document.querySelector<HTMLInputElement>('#web-console-input');
  const close = document.querySelector<HTMLButtonElement>('#web-console-close');
  const status = document.querySelector<HTMLElement>('#web-console-status');
  if (!panel || !history || !form || !input || !close || !status) return false;

  let session;
  try {
    session = await loadWebConsoleSession();
  } catch {
    return false;
  }
  if (!session?.enabled || !session.authenticated || !session.player) return false;

  mounted = true;
  panel.dataset.playerUuid = session.player.uuid;
  const identity = panel.querySelector<HTMLElement>('#web-console-identity');
  if (identity) identity.textContent = session.player.username;
  updateStatus(status, 'Connected', false);

  const toggle = createConsoleToggle(session.player.username);
  toggle.addEventListener('click', () => showWebConsole());
  close.addEventListener('click', hideWebConsole);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitInput(input, status);
  });
  window.addEventListener('keydown', handleConsoleKeyDown, { capture: true });
  panel.addEventListener('pointerup', persistPanelSize);
  restorePanelSize(panel);
  return true;
}

export function showWebConsole(): void {
  if (!mounted) return;
  const panel = document.querySelector<HTMLElement>('#web-console');
  const input = document.querySelector<HTMLInputElement>('#web-console-input');
  if (!panel || !input) return;
  open = true;
  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
  document.querySelector('.web-console-toggle')?.classList.add('active');
  input.focus();
  void refreshHistory();
  startPolling();
}

export function hideWebConsole(): void {
  const panel = document.querySelector<HTMLElement>('#web-console');
  if (!panel) return;
  open = false;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  document.querySelector('.web-console-toggle')?.classList.remove('active');
  stopPolling();
}

export function isWebConsoleShortcut(event: KeyboardEvent): boolean {
  return event.code === 'KeyT'
    && !event.ctrlKey && !event.metaKey && !event.altKey
    && !isEditableTarget(event.target);
}

function handleConsoleKeyDown(event: KeyboardEvent) {
  if (isWebConsoleShortcut(event)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showWebConsole();
    return;
  }
  if (open && event.code === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    hideWebConsole();
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

async function submitInput(input: HTMLInputElement, status: HTMLElement) {
  const value = input.value.trim();
  if (!value) return;
  input.disabled = true;
  updateStatus(status, 'Sending…', false);
  try {
    await submitWebConsoleInput(value);
    input.value = '';
    updateStatus(status, 'Connected', false);
    await refreshHistory();
  } catch (error) {
    updateStatus(status, error instanceof Error ? error.message : 'Send failed', true);
  } finally {
    input.disabled = false;
    input.focus();
  }
}

async function refreshHistory() {
  if (!open) return;
  try {
    const entries = await loadWebConsoleHistory(lastEntryId);
    if (!entries.length) return;
    const history = document.querySelector<HTMLElement>('#web-console-history');
    if (!history) return;
    const nearBottom = history.scrollHeight - history.scrollTop - history.clientHeight < 50;
    entries.forEach((entry) => {
      history.appendChild(renderEntry(entry));
      lastEntryId = Math.max(lastEntryId, entry.id);
    });
    while (history.childElementCount > 250) history.firstElementChild?.remove();
    if (nearBottom) history.scrollTop = history.scrollHeight;
  } catch {
    // Polling is best-effort; submission errors are surfaced directly in the status line.
  }
}

function renderEntry(entry: WebConsoleEntry): HTMLElement {
  const row = document.createElement('div');
  row.className = `web-console-entry ${entry.kind}`;
  const time = document.createElement('time');
  time.dateTime = new Date(entry.timestamp).toISOString();
  time.textContent = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const author = document.createElement('strong');
  author.textContent = entry.username;
  const content = document.createElement('span');
  content.textContent = entry.content;
  row.append(time, author, content);
  return row;
}

function createConsoleToggle(username: string): HTMLButtonElement {
  const existing = document.querySelector<HTMLButtonElement>('.web-console-toggle');
  if (existing) return existing;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'web-console-toggle';
  button.textContent = 'Chat';
  button.title = `Open chat as ${username} (T)`;
  button.setAttribute('aria-label', `Open web chat as ${username}`);
  (document.querySelector('.titlebar-actions') ?? document.body).prepend(button);
  return button;
}

function updateStatus(element: HTMLElement, message: string, error: boolean) {
  element.textContent = message;
  element.classList.toggle('error', error);
}

function startPolling() {
  stopPolling();
  polling = window.setInterval(() => void refreshHistory(), POLL_INTERVAL_MS);
}

function stopPolling() {
  if (polling !== null) window.clearInterval(polling);
  polling = null;
}

function persistPanelSize() {
  const panel = document.querySelector<HTMLElement>('#web-console');
  if (!panel) return;
  try {
    sessionStorage.setItem('terrascape.webConsoleSize', JSON.stringify({
      width: panel.offsetWidth,
      height: panel.offsetHeight,
    }));
  } catch {
    // Storage is optional.
  }
}

function restorePanelSize(panel: HTMLElement) {
  try {
    const size = JSON.parse(sessionStorage.getItem('terrascape.webConsoleSize') ?? 'null');
    if (size?.width > 300) panel.style.width = `${Math.min(size.width, window.innerWidth - 24)}px`;
    if (size?.height > 180) panel.style.height = `${Math.min(size.height, window.innerHeight - 90)}px`;
  } catch {
    // Ignore malformed or unavailable stored state.
  }
}
