import { apiFetch } from '../platform/api-client.ts';
import {
  serverCpuValueEl,
  serverDetailCpuEl,
  serverDetailHostCpuEl,
  serverDetailHostMemoryEl,
  serverDetailMemoryEl,
  serverDetailThreadsEl,
  serverDetailUpdatedEl,
  serverMemoryValueEl,
} from './dom.ts';

const SERVER_DETAILS_POLL_MS = 2500;
let serverDetailsTimer = null;

export function startServerDetailsFeed() {
  stopServerDetailsFeed();
  void refreshServerDetails();
}

export function stopServerDetailsFeed() {
  if (serverDetailsTimer) {
    clearTimeout(serverDetailsTimer);
    serverDetailsTimer = null;
  }
}

export async function refreshServerDetails() {
  try {
    const response = await apiFetch('/api/metrics', { cache: 'no-store' });
    if (response.status === 404) {
      renderServerDetailsUnavailable('disabled');
      return;
    }
    if (!response.ok) {
      throw new Error(`Server metrics request failed: ${response.status}`);
    }
    const data = await response.json();
    if (data?.ok) {
      renderServerDetails(data);
    } else {
      renderServerDetailsUnavailable(data?.error ?? 'unavailable');
    }
  } catch (error) {
    renderServerDetailsUnavailable('offline');
  } finally {
    serverDetailsTimer = setTimeout(refreshServerDetails, SERVER_DETAILS_POLL_MS);
  }
}

export function renderServerDetails(metrics) {
  const processCpu = formatPercent(metrics.processCpuLoad);
  const systemCpu = formatPercent(metrics.systemCpuLoad);
  const heap = formatBytePair(metrics.heapUsedBytes, metrics.heapMaxBytes);
  const heapCommitted = formatBytesCompact(metrics.heapCommittedBytes);
  const hostMemory = formatHostMemory(metrics.freeMemoryBytes, metrics.totalMemoryBytes);
  const hostMemoryHeader = formatHostMemoryHeader(metrics.freeMemoryBytes, metrics.totalMemoryBytes);
  const processors = finiteNumber(metrics.availableProcessors);
  const threads = finiteNumber(metrics.threads);

  serverCpuValueEl.textContent = processCpu;
  serverMemoryValueEl.textContent = heap;
  serverDetailCpuEl.textContent = processCpu === '--'
    ? 'unavailable'
    : `Hytale ${processCpu}${processors > 0 ? ` · ${processors} cores` : ''}`;
  serverDetailHostCpuEl.textContent = systemCpu === '--' ? 'unavailable' : systemCpu;
  serverDetailMemoryEl.textContent = heapCommitted === '--'
    ? `Heap ${heap}`
    : `Heap ${heap} · committed ${heapCommitted}`;
  serverDetailHostMemoryEl.textContent = hostMemory ?? hostMemoryHeader ?? 'unavailable';
  serverDetailThreadsEl.textContent = threads > 0 ? String(threads) : 'unavailable';
  serverDetailUpdatedEl.textContent = formatTimestamp(metrics.timestampMs);
}

export function renderServerDetailsUnavailable(reason = 'unavailable') {
  serverCpuValueEl.textContent = '--';
  serverMemoryValueEl.textContent = '--';
  serverDetailCpuEl.textContent = reason;
  serverDetailHostCpuEl.textContent = reason;
  serverDetailMemoryEl.textContent = reason;
  serverDetailHostMemoryEl.textContent = reason;
  serverDetailThreadsEl.textContent = reason;
  serverDetailUpdatedEl.textContent = 'not connected';
}

export function formatPercent(value) {
  const number = finiteNumber(value);
  if (number < 0) return '--';
  return `${Math.round(number * 100)}%`;
}

export function formatBytesCompact(bytes) {
  const value = finiteNumber(bytes);
  if (value <= 0) return '--';
  const kib = 1024;
  const mib = kib * 1024;
  const gib = mib * 1024;
  if (value >= gib) {
    const amount = value / gib;
    return `${amount < 10 ? amount.toFixed(1) : Math.round(amount)} GB`;
  }
  if (value >= mib) {
    const amount = value / mib;
    return `${amount < 100 ? amount.toFixed(1) : Math.round(amount)} MB`;
  }
  return `${Math.max(1, Math.round(value / kib))} KB`;
}

function formatBytePair(usedBytes, maxBytes) {
  const used = formatBytesCompact(usedBytes);
  const max = formatBytesCompact(maxBytes);
  return max === '--' ? used : `${used} / ${max}`;
}

function formatHostMemory(freeBytes, totalBytes) {
  const free = finiteNumber(freeBytes);
  const total = finiteNumber(totalBytes);
  if (free < 0 || total <= 0) return null;
  const used = Math.max(0, total - free);
  return `${formatBytesCompact(used)} / ${formatBytesCompact(total)} · free ${formatBytesCompact(free)}`;
}

function formatHostMemoryHeader(freeBytes, totalBytes) {
  const free = finiteNumber(freeBytes);
  const total = finiteNumber(totalBytes);
  if (free < 0 || total <= 0) return null;
  const used = Math.max(0, total - free);
  return `${formatBytesCompact(used)} / ${formatBytesCompact(total)}`;
}

function formatTimestamp(timestampMs) {
  const value = finiteNumber(timestampMs);
  if (value <= 0) return 'unknown';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : -1;
}
