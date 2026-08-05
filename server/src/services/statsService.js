// Weekly completion stats, built from ticket_status_history rather than
// tickets.status directly: a ticket that's moved to done and back
// several times must still show up as completed in whichever week it
// was (most recently) marked done in, even after later status changes
// move it elsewhere - reading the current tasks.status column instead
// would silently rewrite history every time a ticket's status changes.
//
// Scoped the same way every other ticket-related service is: only
// teams the requesting user belongs to.
import { query } from '../db.js';

const MAX_WEEKS_BACK = 52;

function startOfIsoWeekUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday of this ISO week
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
  if (!bucket[id]) {
    bucket[id] = { id, name, ticketsCompleted: 0, pointsCompleted: 0 };
  }
  bucket[id].ticketsCompleted += 1;
  bucket[id].pointsCompleted += points ?? 0;
}

export async function getWeeklyStats(userId, { week, weeksBack = 1 } = {}) {
  if (!Number.isInteger(weeksBack) || weeksBack < 1 || weeksBack > MAX_WEEKS_BACK) {
    throw new Error(`weeksBack must be an integer between 1 and ${MAX_WEEKS_BACK}`);
  }
  const anchor = week ? new Date(week) : new Date();
  if (isNaN(anchor.getTime())) {
    throw new Error('week must be a valid date, e.g. 2026-08-06');
  }

  const { rows: teamRows } = await query('SELECT team_id FROM team_members WHERE user_id = $1', [userId]);
  const teamIds = teamRows.map((r) => r.team_id);

  const targetWeekStart = startOfIsoWeekUTC(anchor);
  const rangeStart = new Date(targetWeekStart);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 7 * (weeksBack - 1));
  const rangeEnd = new Date(targetWeekStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);

  const weeks = [];
  for (let i = 0; i < weeksBack; i++) {
    const start = new Date(rangeStart);
    start.setUTCDate(start.getUTCDate() + 7 * i);
    weeks.push(emptyWeek(start));
  }

  if (teamIds.length === 0) {
    return { weeks };
  }

  // DISTINCT ON (ticket, week) keeps only the most recent transition
  // into 'done' per ticket per week, so a ticket toggled done/reopened
  // twice in the same week is counted once for that week.
  const { rows } = await query(
    `SELECT DISTINCT ON (h.ticket_id, date_trunc('week', h.changed_at, 'UTC'))
       date_trunc('week', h.changed_at, 'UTC') AS week_start,
       t.team_id, tm.name AS team_name,
       t.assignee_id, au.name AS assignee_name,
       t.points
     FROM ticket_status_history h
     JOIN tasks t ON t.id = h.ticket_id
     JOIN teams tm ON tm.id = t.team_id
     LEFT JOIN users au ON au.id = t.assignee_id
     WHERE h.to_status = 'done'
       AND h.changed_at >= $1 AND h.changed_at < $2
       AND t.team_id = ANY($3::int[])
     ORDER BY h.ticket_id, date_trunc('week', h.changed_at, 'UTC'), h.changed_at DESC`,
    [rangeStart.toISOString(), rangeEnd.toISOString(), teamIds]
  );

  const weekByKey = new Map(weeks.map((w) => [w.weekStart, w]));

  for (const row of rows) {
    const bucket = weekByKey.get(row.week_start.toISOString().slice(0, 10));
    if (!bucket) continue;

    bucket.ticketsCompleted += 1;
    bucket.pointsCompleted += row.points ?? 0;
    addToBreakdown(bucket.byTeam, row.team_id, row.team_name, row.points);
    addToBreakdown(bucket.byAssignee, row.assignee_id ?? 'unassigned', row.assignee_name ?? 'Unassigned', row.points);
  }

  for (const w of weeks) {
    w.byTeam = Object.values(w.byTeam);
    w.byAssignee = Object.values(w.byAssignee);
  }

  return { weeks };
}
