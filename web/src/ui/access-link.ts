const ACCESS_KEY_STORAGE_KEY = 'terrascape.mapAccessKey';
const BUTTON_IDLE_TEXT = 'Copy link';
const BUTTON_COPIED_TEXT = 'Copied';
const BUTTON_FAILED_TEXT = 'Copy failed';

export function promoteAccessKeyFromUrl(): string | null {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('key')) {
    return storedAccessKey();
  }

  const key = url.searchParams.get('key') ?? '';
  if (key.trim()) {
    writeStoredAccessKey(key);
  }
  url.searchParams.delete('key');
  window.history.replaceState(null, '', url);
  return key.trim() ? key : null;
}

export function currentMapAccessLink(): string | null {
  const key = storedAccessKey();
  if (!key) {
    return null;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('key', key);
  return url.toString();
}

export function mountAccessLinkButton(): HTMLButtonElement | null {
  if (!storedAccessKey()) {
    return null;
  }

  const existing = document.querySelector<HTMLButtonElement>('.access-link-button');
  if (existing) {
    return existing;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'access-link-button';
  button.textContent = BUTTON_IDLE_TEXT;
  button.title = 'Copy map access link';
  button.setAttribute('aria-label', 'Copy map access link');
  applyButtonStyle(button);
  button.addEventListener('click', () => {
    void copyCurrentMapAccessLink(button);
  });

  const actions = document.querySelector('.titlebar-actions');
  if (actions) {
    actions.prepend(button);
  } else {
    document.body.appendChild(button);
  }
  return button;
}

async function copyCurrentMapAccessLink(button: HTMLButtonElement) {
  const link = currentMapAccessLink();
  if (!link) {
    button.remove();
    return;
  }

  const copied = await copyText(link);
  button.textContent = copied ? BUTTON_COPIED_TEXT : BUTTON_FAILED_TEXT;
  button.classList.toggle('copied', copied);
  button.style.background = copied ? 'rgba(29, 79, 122, 0.88)' : 'rgba(120, 53, 43, 0.88)';
  button.style.borderColor = copied ? 'rgba(214, 241, 228, 0.7)' : 'rgba(241, 170, 154, 0.7)';
  window.setTimeout(() => {
    button.textContent = BUTTON_IDLE_TEXT;
    button.classList.remove('copied');
    button.style.background = 'rgba(31, 107, 87, 0.8)';
    button.style.borderColor = 'rgba(146, 225, 191, 0.4)';
  }, 1400);
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy selection path.
    }
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', 'true');
  field.style.position = 'fixed';
  field.style.left = '-9999px';
  field.style.top = '0';
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

function storedAccessKey(): string | null {
  try {
    const key = window.sessionStorage.getItem(ACCESS_KEY_STORAGE_KEY);
    return key && key.trim() ? key : null;
  } catch {
    return null;
  }
}

function writeStoredAccessKey(key: string) {
  try {
    window.sessionStorage.setItem(ACCESS_KEY_STORAGE_KEY, key);
  } catch {
    // A blocked storage backend should not prevent the cookie-backed session from working.
  }
}

function applyButtonStyle(button: HTMLButtonElement) {
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.minWidth = '82px';
  button.style.height = '30px';
  button.style.padding = '0 10px';
  button.style.border = '1px solid rgba(146, 225, 191, 0.4)';
  button.style.borderRadius = '5px';
  button.style.background = 'rgba(31, 107, 87, 0.8)';
  button.style.color = '#e9fff4';
  button.style.fontSize = '12px';
  button.style.fontWeight = '800';
  button.style.whiteSpace = 'nowrap';
}
