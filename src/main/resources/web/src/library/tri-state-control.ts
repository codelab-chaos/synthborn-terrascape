type TriStateOption = {
  value: string;
  label: string;
};

function dispatchInputChange(input: HTMLInputElement) {
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncTriStateButtons(group: HTMLElement, value: string) {
  for (const button of group.querySelectorAll<HTMLButtonElement>('[data-tri-value]')) {
    const active = button.dataset.triValue === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

export function bindTriStateControl(root: ParentNode, inputId: string, options: TriStateOption[]) {
  const input = root.querySelector<HTMLInputElement>(`#${inputId}`);
  const group = root.querySelector<HTMLElement>(`[data-tri-state-for="${inputId}"]`);
  if (!input || !group) return;

  const allowed = new Set(options.map((option) => option.value));
  if (!allowed.has(input.value) && options[0]) {
    input.value = options[0].value;
  }
  syncTriStateButtons(group, input.value);

  for (const button of group.querySelectorAll<HTMLButtonElement>('[data-tri-value]')) {
    button.addEventListener('click', () => {
      const next = button.dataset.triValue;
      if (!next || !allowed.has(next) || input.value === next) return;
      input.value = next;
      syncTriStateButtons(group, next);
      dispatchInputChange(input);
    });
  }
}

export function setTriStateValue(root: ParentNode, inputId: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`#${inputId}`);
  const group = root.querySelector<HTMLElement>(`[data-tri-state-for="${inputId}"]`);
  if (!input || !group) return;
  input.value = value;
  syncTriStateButtons(group, value);
}

export function applyTriStateValue(input: HTMLInputElement | null, value: string, allowed: string[]) {
  if (!input) return;
  if (!allowed.includes(value)) return;
  input.value = value;
  const group = document.querySelector<HTMLElement>(`[data-tri-state-for="${input.id}"]`);
  if (group) syncTriStateButtons(group, value);
}
