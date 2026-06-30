import { apiFetch } from './api-client.ts';

export interface MapRconResponse {
  ok: boolean;
  command: string;
  messages: string[];
  error?: string;
}

export async function runMapRconCommand(command: string): Promise<MapRconResponse> {
  if (String(command ?? '').trim() === '') {
    throw new Error('Command is required');
  }

  const response = await apiFetch('/api/rcon/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  const data = await readJson(response);
  if (!response.ok || data?.ok !== true) {
    throw new Error(`RCON command failed: ${data?.error ?? `HTTP ${response.status}`}`);
  }
  return {
    ok: true,
    command: String(data.command ?? command),
    messages: Array.isArray(data.messages) ? data.messages.map(String) : [],
    error: data.error == null ? undefined : String(data.error),
  };
}

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
