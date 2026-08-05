// Talks to the real Express API. Used whenever the user is signed in.
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export const realApi = {
  listProjects: () => request('/projects'),
  createProject: (project) => request('/projects', { method: 'POST', body: JSON.stringify(project) }),
  updateProject: (id, fields) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  listTasks: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (task) => request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, fields) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  listMcpTokens: () => request('/mcp-tokens'),
  createMcpToken: (label) => request('/mcp-tokens', { method: 'POST', body: JSON.stringify({ label }) }),
  revokeMcpToken: (id) => request(`/mcp-tokens/${id}`, { method: 'DELETE' }),
};
