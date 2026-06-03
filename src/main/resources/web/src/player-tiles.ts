function playerInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function playerAvatarUrl(player) {
  if (!player?.uuid || !player?.name) return null;
  return `/api/player-avatar/${encodeURIComponent(player.uuid)}.png?name=${encodeURIComponent(player.name)}`;
}

export function createPlayerTile(player, { activeViewUuid, activeFollowUuid, onFocus, onToggleEyeView, onToggleFollow }) {
  const tile = document.createElement('div');
  tile.className = 'player-tile';

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'player-tile-main';
  main.title = 'Move camera to player';
  main.addEventListener('click', () => onFocus(player.uuid));

  const avatar = document.createElement('span');
  avatar.className = 'player-avatar';

  const name = document.createElement('span');
  name.className = 'player-name';
  main.append(avatar, name);

  const actions = document.createElement('div');
  actions.className = 'player-actions';

  const eyeButton = document.createElement('button');
  eyeButton.type = 'button';
  eyeButton.className = `player-icon-button${activeViewUuid === player.uuid ? ' active' : ''}`;
  eyeButton.textContent = '\u{1F441}\uFE0F';
  eyeButton.title = 'Attach camera to player view';
  eyeButton.setAttribute('aria-label', 'Attach camera to player view');
  eyeButton.setAttribute('aria-pressed', String(activeViewUuid === player.uuid));
  eyeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onToggleEyeView(player.uuid);
  });

  const walkButton = document.createElement('button');
  walkButton.type = 'button';
  walkButton.className = `player-icon-button${activeFollowUuid === player.uuid ? ' active' : ''}`;
  walkButton.textContent = '\u{1F6B6}';
  walkButton.title = 'Follow player from isometric view';
  walkButton.setAttribute('aria-label', 'Follow player from isometric view');
  walkButton.setAttribute('aria-pressed', String(activeFollowUuid === player.uuid));
  walkButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onToggleFollow(player.uuid);
  });

  actions.append(eyeButton, walkButton);
  tile.append(main, actions);
  return {
    element: tile,
    avatar,
    avatarUrl: null,
    avatarImage: null,
    name,
    eyeButton,
    walkButton,
  };
}

export function updatePlayerTile(tile, player, { activeViewUuid, activeFollowUuid }) {
  const initials = playerInitials(player.name);
  if (tile.avatar.firstChild?.nodeType === Node.TEXT_NODE) {
    tile.avatar.firstChild.nodeValue = initials;
  } else {
    tile.avatar.prepend(document.createTextNode(initials));
  }
  const avatarUrl = player.avatarUrl ?? playerAvatarUrl(player);
  if (avatarUrl && avatarUrl !== tile.avatarUrl) {
    tile.avatarUrl = avatarUrl;
    tile.avatar.classList.remove('loaded');
    tile.avatarImage?.remove();
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'lazy';
    image.src = avatarUrl;
    image.addEventListener('load', () => tile.avatar.classList.add('loaded'));
    image.addEventListener('error', () => {
      image.remove();
      if (tile.avatarImage === image) {
        tile.avatarImage = null;
      }
      tile.avatar.classList.remove('loaded');
    });
    tile.avatarImage = image;
    tile.avatar.append(image);
  } else if (!avatarUrl && tile.avatarUrl) {
    tile.avatarUrl = null;
    tile.avatarImage?.remove();
    tile.avatarImage = null;
    tile.avatar.classList.remove('loaded');
  }
  tile.name.textContent = player.name;
  tile.eyeButton.classList.toggle('active', activeViewUuid === player.uuid);
  tile.eyeButton.setAttribute('aria-pressed', String(activeViewUuid === player.uuid));
  tile.walkButton.classList.toggle('active', activeFollowUuid === player.uuid);
  tile.walkButton.setAttribute('aria-pressed', String(activeFollowUuid === player.uuid));
}
