import * as THREE from 'three';

export function createMobBadge(mob, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.8, 6.4, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  sprite.userData.texture = texture;
  sprite.userData.colorHex = `#${color.getHexString()}`;
  updateMobBadge(sprite, mob);
  return sprite;
}

export function updateMobBadge(sprite, mob) {
  const key = mobCardKey(mob);
  if (sprite.userData.cardKey === key) return;
  sprite.userData.cardKey = key;
  sprite.userData.mob = { ...mob };
  configureMobBadgeScale(sprite);
  const iconUrl = typeof mob.iconUrl === 'string' ? mob.iconUrl : '';
  if (!iconUrl) {
    sprite.userData.iconUrl = '';
    sprite.userData.iconImage = null;
    drawMobBadge(sprite, mob);
    return;
  }
  if (sprite.userData.iconUrl === iconUrl && sprite.userData.iconImage) {
    drawMobBadge(sprite, mob, sprite.userData.iconImage);
    return;
  }
  sprite.userData.iconUrl = iconUrl;
  sprite.userData.iconImage = null;
  drawMobBadge(sprite, mob);
  const image = new Image();
  image.onload = () => {
    if (sprite.userData.iconUrl !== iconUrl) return;
    sprite.userData.iconImage = image;
    drawMobBadge(sprite, sprite.userData.mob, image);
  };
  image.onerror = () => {
    if (sprite.userData.iconUrl === iconUrl) {
      sprite.userData.iconImage = null;
      drawMobBadge(sprite, sprite.userData.mob);
    }
  };
  image.src = iconUrl;
}

function drawMobBadge(sprite, mob, image = null) {
  const { ctx, canvas, texture, colorHex: hex } = sprite.userData;
  const label = shortMobLabel(mob.label || mob.type || 'Mob');
  const initials = mobInitials(label);
  const count = Number(mob.count ?? mob.stack ?? 1);
  const damage = statText(mob.attackDamage ?? mob.damage ?? mob.attack, '');
  const hp = statText(mob.hp ?? mob.health ?? mob.maxHealth ?? mob.maxHp, '');
  const hideStats = mob.hideStats === true;
  const showDamage = !hideStats && damage !== '';
  const showHp = !hideStats && hp !== '';
  const showCount = !hideStats && Number.isFinite(count) && count > 1;
  const cardX = 18;
  const cardY = 34;
  const cardWidth = 156;
  const cardHeight = 192;
  const cardRadius = 18;
  const labelHeight = 34;
  const labelX = cardX + 5;
  const labelY = cardY + cardHeight - labelHeight - 6;
  const labelWidth = cardWidth - 10;
  const imageInset = 2;
  const artX = cardX + 4;
  const artY = cardY + 42;
  const artWidth = cardWidth - 8;
  const artHeight = 128;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  drawSlateCardBackground(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (image) {
    const panelGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
    panelGradient.addColorStop(0, 'rgba(255, 255, 255, 0.035)');
    panelGradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.015)');
    panelGradient.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    ctx.fillStyle = panelGradient;
    roundRect(ctx, cardX + imageInset, cardY + imageInset, cardWidth - imageInset * 2, cardHeight - imageInset * 2, cardRadius - imageInset);
    ctx.fill();
    drawCardImage(ctx, image, artX, artY, artWidth, artHeight, 10);
    ctx.fillStyle = 'rgba(5, 9, 11, 0.04)';
    roundRect(ctx, cardX + imageInset, cardY + imageInset, cardWidth - imageInset * 2, cardHeight - imageInset * 2, cardRadius - imageInset);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    roundRect(ctx, 28, 72, 136, 104, 10);
    ctx.fill();
    ctx.fillStyle = hex;
    ctx.font = '900 52px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 96, 122);
  }

  ctx.lineWidth = 6;
  ctx.strokeStyle = hex;
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
  ctx.stroke();

  if (showDamage) {
    const text = `ATK ${damage}`;
    drawStatPill(ctx, cardX + 4, cardY + 4, text, hex, statPillWidth(ctx, text));
  }
  if (showHp) {
    const text = `HP ${hp}`;
    const width = statPillWidth(ctx, text);
    drawStatPill(ctx, cardX + cardWidth - width - 4, cardY + 4, text, hex, width);
  }

  if (showCount) {
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(96, 36, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(5, 8, 10, 0.94)';
    ctx.stroke();
    ctx.fillStyle = '#07100c';
    ctx.font = '1000 38px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(count)), 96, 36);
  }

  ctx.fillStyle = image ? 'rgba(4, 8, 10, 0.78)' : 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 8);
  ctx.fill();
  ctx.fillStyle = '#f2fbf7';
  ctx.font = fitFont(ctx, label, labelWidth - 18, 19, 12);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cardX + cardWidth / 2, labelY + labelHeight / 2);

  texture.needsUpdate = true;
}

function configureMobBadgeScale(sprite) {
  sprite.scale.set(4.8, 6.4, 1);
}

function drawSlateCardBackground(ctx, x, y, width, height, radius) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, 'rgba(30, 41, 59, 0.98)');
  gradient.addColorStop(0.45, 'rgba(15, 23, 42, 0.98)');
  gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  const sheen = ctx.createLinearGradient(x, y, x, y + height);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  sheen.addColorStop(0.34, 'rgba(255, 255, 255, 0.02)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = sheen;
  roundRect(ctx, x + 2, y + 2, width - 4, height - 4, Math.max(1, radius - 2));
  ctx.fill();
}

function statPillWidth(ctx, text) {
  ctx.font = '900 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  return Math.ceil(Math.max(46, Math.min(66, ctx.measureText(text).width + 14)));
}

function drawStatPill(ctx, x, y, text, hex, width) {
  const height = 24;
  ctx.fillStyle = 'rgba(4, 8, 10, 0.92)';
  ctx.strokeStyle = hex;
  ctx.lineWidth = 2.5;
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#edf7f2';
  ctx.font = fitFont(ctx, text, width - 10, 12, 10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
}

const imageContentBounds = new WeakMap();

function drawCardImage(ctx, image, x, y, width, height, radius = 0, cover = false) {
  const bounds = transparentContentBounds(image);
  const sourceX = bounds?.x ?? 0;
  const sourceY = bounds?.y ?? 0;
  const sourceWidth = bounds?.width ?? image.naturalWidth;
  const sourceHeight = bounds?.height ?? image.naturalHeight;
  const ratio = cover
    ? Math.max(width / sourceWidth, height / sourceHeight)
    : Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = Math.max(1, sourceWidth * ratio);
  const drawHeight = Math.max(1, sourceHeight * ratio);
  ctx.save();
  if (radius > 0) {
    roundRect(ctx, x, y, width, height, radius);
    ctx.clip();
  }
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

function transparentContentBounds(image) {
  if (imageContentBounds.has(image)) return imageContentBounds.get(image);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha < 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const bounds = maxX < minX || maxY < minY
    ? null
    : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  imageContentBounds.set(image, bounds);
  return bounds;
}

function fitFont(ctx, text, maxWidth, startSize, minSize) {
  for (let size = startSize; size >= minSize; size -= 1) {
    const font = `900 ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) return font;
  }
  return `900 ${minSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

function mobCardKey(mob) {
  return [
    mob.label,
    mob.type,
    mob.iconUrl,
    mob.count,
    mob.stack,
    mob.attackDamage,
    mob.damage,
    mob.attack,
    mob.hp,
    mob.health,
    mob.maxHealth,
    mob.maxHp,
    mob.playerCard,
    mob.hideStats,
  ].join('|');
}

function statText(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.round(value));
  }
  const text = String(value ?? '').trim();
  return text.length > 0 ? text.slice(0, 4).toUpperCase() : '';
}

function mobInitials(text) {
  const words = String(text)
    .replace(/^NPC_/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length >= 2
    ? `${words[0][0]}${words[1][0]}`
    : (words[0] || 'M').slice(0, 2);
  return letters.toUpperCase();
}

function shortMobLabel(text) {
  return String(text)
    .replace(/^NPC_/, '')
    .replace(/_Wander$/i, '')
    .replace(/_Fighter$/i, '')
    .replace(/_+/g, ' ')
    .trim()
    .slice(0, 18) || 'Mob';
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
