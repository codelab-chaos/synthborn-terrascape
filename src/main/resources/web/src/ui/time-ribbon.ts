const SKY_KEYFRAMES = [
  { p: 0.00, top: [12, 18, 46], bottom: [26, 32, 70] },
  { p: 0.20, top: [40, 54, 110], bottom: [120, 80, 120] },
  { p: 0.27, top: [70, 96, 175], bottom: [243, 170, 135] },
  { p: 0.34, top: [78, 152, 212], bottom: [205, 234, 240] },
  { p: 0.50, top: [46, 142, 216], bottom: [208, 240, 244] },
  { p: 0.66, top: [78, 152, 212], bottom: [205, 234, 240] },
  { p: 0.73, top: [86, 70, 150], bottom: [240, 118, 64] },
  { p: 0.80, top: [44, 42, 104], bottom: [120, 70, 120] },
  { p: 0.90, top: [16, 22, 54], bottom: [30, 36, 76] },
  { p: 1.00, top: [12, 18, 46], bottom: [26, 32, 70] },
];

export function createTimeRibbon({ labelEl, sceneEl, sunEl, moonEl, starsEl }) {
  function update(worldTime) {
    if (!worldTime) {
      labelEl.value = '--:--';
      renderSky(0.5);
      return;
    }

    const progress = normalizedProgress(worldTime.dayProgress);
    const totalMinutes = Math.floor(progress * 24 * 60);
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const phase = typeof worldTime.phase === 'string' && worldTime.phase.length > 0
      ? worldTime.phase.replace(/_/g, ' ')
      : 'cycle';
    labelEl.value = `${pad2(hour)}:${pad2(minute)} ${phase}`;
    renderSky(progress);
  }

  function renderSky(progress) {
    const { top, bottom } = skyColors(progress);
    sceneEl.style.background = `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;

    const day = dayFactor(progress);
    placeSkyBody(sunEl, (progress - 0.25) / 0.5, day);
    const moonProgress = progress >= 0.5 ? progress : progress + 1;
    placeSkyBody(moonEl, (moonProgress - 0.75) / 0.5, 1 - day);
    starsEl.style.opacity = (1 - day).toFixed(3);
  }

  return { update };
}

function skyColors(progress) {
  let lo = SKY_KEYFRAMES[0];
  let hi = SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1];
  for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
    if (progress >= SKY_KEYFRAMES[i].p && progress <= SKY_KEYFRAMES[i + 1].p) {
      lo = SKY_KEYFRAMES[i];
      hi = SKY_KEYFRAMES[i + 1];
      break;
    }
  }
  const t = (progress - lo.p) / (hi.p - lo.p || 1);
  return { top: lerpColor(lo.top, hi.top, t), bottom: lerpColor(lo.bottom, hi.bottom, t) };
}

function placeSkyBody(el, t, opacity) {
  const clamped = Math.max(0, Math.min(1, t));
  const arc = Math.sin(clamped * Math.PI);
  el.style.left = `${6 + clamped * 88}%`;
  el.style.top = `${78 - arc * 62}%`;
  el.style.opacity = opacity.toFixed(3);
}

function dayFactor(progress) {
  return Math.min(smoothstep(0.21, 0.30, progress), 1 - smoothstep(0.70, 0.79, progress));
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerpColor(a, b, t) {
  const channel = (i) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function normalizedProgress(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return ((value % 1) + 1) % 1;
}

function pad2(value) {
  return Math.max(0, Math.min(99, Math.floor(value))).toString().padStart(2, '0');
}
