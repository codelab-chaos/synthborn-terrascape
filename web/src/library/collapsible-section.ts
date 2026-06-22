function setHudSectionOpen(section: HTMLElement, open: boolean) {
  const head = section.querySelector<HTMLButtonElement>('.hud-section-head');
  if (!head) return;
  section.classList.toggle('collapsed', !open);
  head.setAttribute('aria-expanded', String(open));
}

function toggleHudSection(section: HTMLElement) {
  setHudSectionOpen(section, section.classList.contains('collapsed'));
}

export function bindHudSectionCollapsibles(root: ParentNode = document, onToggle?: () => void) {
  for (const head of root.querySelectorAll<HTMLButtonElement>('.hud-section-head')) {
    const section = head.closest<HTMLElement>('.hud-section');
    if (!section) continue;

    const toggle = () => {
      toggleHudSection(section);
      onToggle?.();
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }
}

export function setHudSectionCollapsed(sectionId: string, collapsed: boolean) {
  const section = document.querySelector<HTMLElement>(`.hud-section[data-section="${sectionId}"]`);
  if (!section) return;
  setHudSectionOpen(section, !collapsed);
}

// Reads the collapsed state of every identifiable HUD section as a { sectionId: collapsed } map.
export function collapsedSectionState(root: ParentNode = document): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const section of root.querySelectorAll<HTMLElement>('.hud-section[data-section]')) {
    const id = section.dataset.section;
    if (id) state[id] = section.classList.contains('collapsed');
  }
  return state;
}

// Restores collapsed state from a { sectionId: collapsed } map; unknown/missing sections are left untouched.
export function applyCollapsedSectionState(state: Record<string, boolean> | undefined | null) {
  if (!state || typeof state !== 'object') return;
  for (const [id, collapsed] of Object.entries(state)) {
    if (typeof collapsed === 'boolean') setHudSectionCollapsed(id, collapsed);
  }
}
