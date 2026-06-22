// Build metadata injected at bundle time by webpack DefinePlugin (see webpack.config.cjs).
declare const __BUILD_INFO__: { version: string; channel: string; sha: string; time: string };

function formatBuildTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function mountBuildBadge() {
  const info = __BUILD_INFO__;
  const badge = document.createElement('div');
  badge.className = 'build-badge';
  badge.textContent = `v${info.version} [${info.channel}] · ${info.sha} · ${formatBuildTime(info.time)}`;
  badge.title = `Release v${info.version} [${info.channel}]\nBuild ${info.sha}\n${info.time}\n(click to copy build info)`;
  const clipboardLine = `Terrascape v${info.version} [${info.channel}] · ${info.sha} · ${info.time}`;
  badge.addEventListener('click', () => {
    navigator.clipboard?.writeText(clipboardLine).catch(() => {});
  });
  document.body.appendChild(badge);
}
