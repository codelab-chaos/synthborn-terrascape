function setHudSectionOpen(section: HTMLElement, open: boolean) {
  const head = section.querySelector<HTMLButtonElement>('.hud-section-head');
  if (!head) return;
  section.classList.toggle('collapsed', !open);
  head.setAttribute('aria-expanded', String(open));
}

function toggleHudSection(section: HTMLElement) {
  setHudSectionOpen(section, section.classList.contains('collapsed'));
}

export function bindHudSectionCollapsibles(root: ParentNode = document) {
  for (const head of root.querySelectorAll<HTMLButtonElement>('.hud-section-head')) {
    const section = head.closest<HTMLElement>('.hud-section');
    if (!section) continue;

    head.addEventListener('click', () => toggleHudSection(section));
    head.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleHudSection(section);
    });
  }
}

export function setHudSectionCollapsed(sectionId: string, collapsed: boolean) {
  const section = document.querySelector<HTMLElement>(`.hud-section[data-section="${sectionId}"]`);
  if (!section) return;
  setHudSectionOpen(section, !collapsed);
}
