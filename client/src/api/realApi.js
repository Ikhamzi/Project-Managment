// Talks to the real Express API. Used whenever the user is signed in.
const BASE = '/api';

function toQueryString(params = {}) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  ).toString();
}

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

  listTeams: () => request('/teams'),
  createTeam: (team) => request('/teams', { method: 'POST', body: JSON.stringify(team) }),
  listTeamMembers: (teamId) => request(`/teams/${teamId}/members`),
  addTeamMember: (teamId, email) =>
    request(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ email }) }),

  listTickets: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/tickets${qs ? `?${qs}` : ''}`);
  },
  createTicket: (ticket) => request('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
  updateTicket: (id, fields) => request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  deleteTicket: (id) => request(`/tickets/${id}`, { method: 'DELETE' }),

  listComments: (ticketId) => request(`/tickets/${ticketId}/comments`),
  addComment: (ticketId, body) =>
    request(`/tickets/${ticketId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),

  getWeeklyStats: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/stats/weekly${qs ? `?${qs}` : ''}`);
  },

  listMcpTokens: () => request('/mcp-tokens'),
  createMcpToken: (label) => request('/mcp-tokens', { method: 'POST', body: JSON.stringify({ label }) }),
  revokeMcpToken: (id) => request(`/mcp-tokens/${id}`, { method: 'DELETE' }),

  getOAuthRequest: (requestId) => request(`/oauth/pending/${requestId}`),
  decideOAuthRequest: (requestId, approve) =>
    request(`/oauth/pending/${requestId}/decision`, { method: 'POST', body: JSON.stringify({ approve }) }),
};
