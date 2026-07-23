import { apiFetch } from './api-client.ts';

export type WebConsoleSession = {
  ok: boolean;
  enabled: boolean;
  authenticated?: boolean;
  online?: boolean;
  player?: { uuid: string; username: string };
};

export type WebConsoleEntry = {
  id: number;
  timestamp: number;
  kind: 'chat' | 'command' | 'system' | 'error';
  username: string;
  content: string;
};

export async function loadWebConsoleSession(): Promise<WebConsoleSession | null> {
  const response = await apiFetch('/api/console/session');
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Console session failed (${response.status})`);
  return response.json();
}

export async function loadWebConsoleHistory(after = 0): Promise<WebConsoleEntry[]> {
  const response = await apiFetch(`/api/console/history?after=${Math.max(0, after)}`);
  if (!response.ok) throw new Error(`Console history failed (${response.status})`);
  const body = await response.json();
  return Array.isArray(body.entries) ? body.entries : [];
}

export async function submitWebConsoleInput(input: string): Promise<void> {
  const response = await apiFetch('/api/console/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (response.ok) return;
  let message = `Console submission failed (${response.status})`;
  try {
    const body = await response.json();
    if (typeof body.message === 'string' && body.message) message = body.message;
  } catch {
    // Retain the status-based error when the response is not JSON.
  }
  throw new Error(message);
}
