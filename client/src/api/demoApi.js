// Entirely in-memory implementation of the same functions realApi.js
// exposes, including the teams/tickets/comments/stats surface - used
// when someone clicks "Try Demo" instead of signing in. Nothing here
// ever reaches the server or Postgres, and a page refresh wipes it back
// to the seed data below. The demo user is always id 1 ("You"), seeded
// as a member of "Product Team" alongside a second demo teammate so
// assignee pickers and stats breakdowns have something to show.
const YOU = { id: 1, name: 'You', email: 'you@demo.local' };
const ADA = { id: 2, name: 'Ada Lovelace', email: 'ada@demo.local' };
const USERS = [YOU, ADA];

const now = new Date();
const isoWeeksAgo = (n) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n * 7);
  return d.toISOString();
};

let nextProjectId = 3;
let nextTeamId = 2;
let nextTicketId = 10;
let nextCommentId = 3;
let nextHistoryId = 1;

let teams = [{ id: 1, name: 'Product Team', created_at: now.toISOString() }];
let teamMembers = [
  { team_id: 1, user_id: 1 },
  { team_id: 1, user_id: 2 },
];

let projects = [
  { id: 1, user_id: 1, name: 'Website Redesign', description: 'Refresh the marketing site', team_id: 1, created_at: now.toISOString() },
  { id: 2, user_id: 1, name: 'Q3 Launch', description: 'Ship the Q3 feature set', team_id: 1, created_at: now.toISOString() },
];

function ticket(overrides) {
  return {
    id: overrides.id,
    project_id: overrides.project_id,
    title: overrides.title,
    description: overrides.description ?? '',
    status: overrides.status,
    priority: overrides.priority ?? 'medium',
    points: overrides.points ?? null,
    assignee_id: overrides.assignee_id ?? null,
    team_id: 1,
    created_at: overrides.created_at ?? now.toISOString(),
    updated_at: overrides.updated_at ?? now.toISOString(),
  };
}

let tickets = [
  ticket({ id: 1, project_id: 1, title: 'Wireframe homepage', status: 'done', points: 5, assignee_id: 2, priority: 'high', description: 'Low-fidelity wireframes for the new homepage layout.' }),
  ticket({ id: 2, project_id: 1, title: 'Pick color palette', status: 'done', points: 3, assignee_id: 1, priority: 'low' }),
  ticket({ id: 3, project_id: 1, title: 'Set up analytics', status: 'in_review', points: 3, assignee_id: 2, priority: 'medium', description: '# Analytics\nWire up event tracking for the new signup flow.' }),
  ticket({ id: 4, project_id: 2, title: 'Write launch announcement', status: 'todo', points: 2, assignee_id: null, priority: 'medium' }),
  ticket({ id: 5, project_id: 2, title: 'Beta tester outreach', status: 'in_progress', points: 8, assignee_id: 1, priority: 'high' }),
  ticket({ id: 6, project_id: 1, title: 'Accessibility audit', status: 'backlog', points: 1, assignee_id: null, priority: 'low' }),
  ticket({ id: 7, project_id: 2, title: 'Ship pricing page', status: 'done', points: 8, assignee_id: 2, priority: 'high' }),
  ticket({ id: 8, project_id: 1, title: 'Fix mobile nav bug', status: 'done', points: 5, assignee_id: 1, priority: 'medium' }),
  ticket({ id: 9, project_id: 2, title: 'Retire legacy migration script', status: 'cancelled', points: 3, assignee_id: null, priority: 'low' }),
];

let comments = [
  { id: 1, ticket_id: 3, author_id: 2, body: 'Started on this - using Plausible instead of GA.', created_at: isoWeeksAgo(0.2) },
  { id: 2, ticket_id: 3, author_id: 1, body: 'Sounds good. **Ping me** before it ships so I can double check the events.', created_at: isoWeeksAgo(0.1) },
];

// Mirrors ticket_status_history: every transition a ticket goes
// through, so getWeeklyStats can be based on *when* a ticket was marked
// done rather than its current status - same rule as statsService.js.
let statusHistory = [
  { id: nextHistoryId++, ticket_id: 1, to_status: 'done', changed_at: isoWeeksAgo(3) },
  { id: nextHistoryId++, ticket_id: 2, to_status: 'done', changed_at: isoWeeksAgo(2) },
  { id: nextHistoryId++, ticket_id: 7, to_status: 'done', changed_at: isoWeeksAgo(1) },
  { id: nextHistoryId++, ticket_id: 8, to_status: 'done', changed_at: isoWeeksAgo(0) },
];

const delay = () => new Promise((r) => setTimeout(r, 150));

function withNames(t) {
  return t;
}

function requireTeamMembership(teamId) {
  if (!teamMembers.some((m) => m.team_id === Number(teamId) && m.user_id === YOU.id)) {
    throw new Error('Team not found');
  }
}

// --- weekly stats, same algorithm as server/src/services/statsService.js ---
function startOfIsoWeekUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
function emptyWeek(start) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
    ticketsCompleted: 0,
    pointsCompleted: 0,
    byTeam: {},
    byAssignee: {},
  };
}
function addToBreakdown(bucket, id, name, points) {
  if (!bucket[id]) bucket[id] = { id, name, ticketsCompleted: 0, pointsCompleted: 0 };
  bucket[id].ticketsCompleted += 1;
  bucket[id].pointsCompleted += points ?? 0;
}

export const demoApi = {
  async listProjects() {
    await delay();
    return [...projects].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async createProject({ name, description = '', teamId }) {
    await delay();
    if (!teamId) throw new Error('teamId is required');
    requireTeamMembership(teamId);
    const project = { id: nextProjectId++, user_id: YOU.id, name, description, team_id: Number(teamId), created_at: new Date().toISOString() };
    projects = [project, ...projects];
    return project;
  },
  async updateProject(id, fields) {
    await delay();
    projects = projects.map((p) => (p.id === Number(id) ? { ...p, ...fields } : p));
    return projects.find((p) => p.id === Number(id));
  },
  async deleteProject(id) {
    await delay();
    projects = projects.filter((p) => p.id !== Number(id));
    tickets = tickets.filter((t) => t.project_id !== Number(id));
    return null;
  },

  async listTeams() {
    await delay();
    const myTeamIds = teamMembers.filter((m) => m.user_id === YOU.id).map((m) => m.team_id);
    return teams.filter((t) => myTeamIds.includes(t.id));
  },
  async createTeam({ name }) {
    await delay();
    const team = { id: nextTeamId++, name, created_at: new Date().toISOString() };
    teams = [team, ...teams];
    teamMembers = [...teamMembers, { team_id: team.id, user_id: YOU.id }];
    return team;
  },
  async listTeamMembers(teamId) {
    await delay();
    return teamMembers
      .filter((m) => m.team_id === Number(teamId))
      .map((m) => USERS.find((u) => u.id === m.user_id))
      .filter(Boolean);
  },
  async addTeamMember(teamId, email) {
    await delay();
    requireTeamMembership(teamId);
    const user = USERS.find((u) => u.email === email);
    if (!user) throw new Error(`No account found for ${email}. In demo mode only "ada@demo.local" exists.`);
    if (!teamMembers.some((m) => m.team_id === Number(teamId) && m.user_id === user.id)) {
      teamMembers = [...teamMembers, { team_id: Number(teamId), user_id: user.id }];
    }
    return this.listTeamMembers(teamId);
  },

  async listTickets({ projectId, teamId, assigneeId, status } = {}) {
    await delay();
    return tickets
      .filter((t) => (projectId ? t.project_id === Number(projectId) : true))
      .filter((t) => (teamId ? t.team_id === Number(teamId) : true))
      .filter((t) => (status ? t.status === status : true))
      .filter((t) => {
        if (assigneeId === undefined || assigneeId === null || assigneeId === '') return true;
        if (assigneeId === 'unassigned') return t.assignee_id === null;
        return t.assignee_id === Number(assigneeId);
      })
      .map(withNames)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async createTicket({ projectId, title, description = '', status = 'backlog', priority = 'medium', points = null, assigneeId = null }) {
    await delay();
    const t = ticket({
      id: nextTicketId++,
      project_id: Number(projectId),
      title,
      description,
      status,
      priority,
      points,
      assignee_id: assigneeId ?? null,
    });
    tickets = [t, ...tickets];
    statusHistory = [...statusHistory, { id: nextHistoryId++, ticket_id: t.id, to_status: t.status, changed_at: new Date().toISOString() }];
    return t;
  },
  async updateTicket(id, fields) {
    await delay();
    const existing = tickets.find((t) => t.id === Number(id));
    if (!existing) return null;
    const merged = { ...existing, ...fields, updated_at: new Date().toISOString() };
    if (fields.assigneeId !== undefined) merged.assignee_id = fields.assigneeId;
    tickets = tickets.map((t) => (t.id === Number(id) ? merged : t));
    if (fields.status && fields.status !== existing.status) {
      statusHistory = [...statusHistory, { id: nextHistoryId++, ticket_id: existing.id, to_status: fields.status, changed_at: new Date().toISOString() }];
    }
    return merged;
  },
  async deleteTicket(id) {
    await delay();
    tickets = tickets.filter((t) => t.id !== Number(id));
    return null;
  },

  async listComments(ticketId) {
    await delay();
    return comments
      .filter((c) => c.ticket_id === Number(ticketId))
      .map((c) => ({ ...c, author_name: USERS.find((u) => u.id === c.author_id)?.name, author_email: USERS.find((u) => u.id === c.author_id)?.email }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async addComment(ticketId, body) {
    await delay();
    const comment = { id: nextCommentId++, ticket_id: Number(ticketId), author_id: YOU.id, body, created_at: new Date().toISOString() };
    comments = [...comments, comment];
    return { ...comment, author_name: YOU.name, author_email: YOU.email };
  },

  async getWeeklyStats({ week, weeksBack = 1 } = {}) {
    await delay();
    const anchor = week ? new Date(week) : new Date();
    const targetWeekStart = startOfIsoWeekUTC(anchor);
    const rangeStart = new Date(targetWeekStart);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 7 * (weeksBack - 1));

    const weeks = [];
    for (let i = 0; i < weeksBack; i++) {
      const start = new Date(rangeStart);
      start.setUTCDate(start.getUTCDate() + 7 * i);
      weeks.push(emptyWeek(start));
    }
    const weekByKey = new Map(weeks.map((w) => [w.weekStart, w]));

    // DISTINCT-ON equivalent: most recent 'done' transition per ticket per week.
    const seen = new Map();
    for (const h of statusHistory) {
      if (h.to_status !== 'done') continue;
      const changedAt = new Date(h.changed_at);
      const wk = startOfIsoWeekUTC(changedAt).toISOString().slice(0, 10);
      const key = `${h.ticket_id}:${wk}`;
      const existing = seen.get(key);
      if (!existing || existing.changed_at < h.changed_at) {
        seen.set(key, { ...h, weekKey: wk });
      }
    }

    for (const h of seen.values()) {
      const bucket = weekByKey.get(h.weekKey);
      if (!bucket) continue;
      const t = tickets.find((x) => x.id === h.ticket_id);
      if (!t) continue;
      const team = teams.find((tm) => tm.id === t.team_id);
      const assignee = USERS.find((u) => u.id === t.assignee_id);

      bucket.ticketsCompleted += 1;
      bucket.pointsCompleted += t.points ?? 0;
      addToBreakdown(bucket.byTeam, t.team_id, team?.name ?? 'Unknown team', t.points);
      addToBreakdown(bucket.byAssignee, t.assignee_id ?? 'unassigned', assignee?.name ?? 'Unassigned', t.points);
    }

    for (const w of weeks) {
      w.byTeam = Object.values(w.byTeam);
      w.byAssignee = Object.values(w.byAssignee);
    }
    return { weeks };
  },
};
