export const API_BASE = '/api';

type JsonLike = Record<string, any> | Array<any> | null;

async function parseJsonSafe(resp: Response): Promise<JsonLike> {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function handleResponse<T = JsonLike>(resp: Response): Promise<T> {
  const data = await parseJsonSafe(resp);
  if (!resp.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as any).error === 'string'
        ? (data as any).error
        : `API error ${resp.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = resp.status;
    throw error;
  }
  return data as T;
}

export async function fetchUsers(q = '', page = 1, limit = 10) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('limit', String(limit));
  const resp = await fetch(`${API_BASE}/users/all?${params.toString()}`);
  const data = await handleResponse<{ users: any[]; total: number; page: number; limit: number } | any[]>(resp);
  if (Array.isArray(data)) {
    return { users: data, total: data.length, page: 1, limit };
  }
  return data ?? { users: [], total: 0, page: 1, limit };
}

export async function addUser<T = any>(user: T): Promise<{ user: T } | T | null> {
  const resp = await fetch(`${API_BASE}/users/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
  });
  return handleResponse<{ user: T } | T | null>(resp);
}

export async function updateUser(user: any) {
  const resp = await fetch(`${API_BASE}/users/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
  });
  return handleResponse(resp);
}

export async function deleteUser(id: string | number) {
  const resp = await fetch(`${API_BASE}/users/delete/${id}`, { method: 'DELETE' });
  return handleResponse(resp);
}
