-- Linear-style workplace ticketing on top of 001_init.sql's users/
-- projects/tasks. Applied automatically alongside every other file in
-- this directory (see runMigrations.js) so it's safe to run on every
-- boot - like 001_init.sql, everything here is written to be re-run
-- without error (IF NOT EXISTS / DROP-then-ADD for constraints).
--
-- "Tickets" are the existing `tasks` table, extended in place rather
-- than renamed: the old columns (title, description, status, priority,
-- due_date, assignee) and every existing task/tasks route, service
-- function and MCP tool keep working exactly as before, untouched. The
-- new ticket-oriented tools (create_ticket, update_ticket, list_tickets
-- in ticketService.js) read and write the same rows through the new
-- columns added below (team_id, assignee_id, points) plus a widened
-- status list.

CREATE TABLE IF NOT EXISTS teams (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Projects now belong to a team. Nullable at the database level so
-- projects created before teams existed stay valid untouched;
-- projectService.createProject requires it going forward for new
-- projects, the same way it already requires a name.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);

-- Ticket-oriented columns on the existing tasks table. All nullable so
-- pre-existing tasks (and the legacy create_task/update_task tools,
-- which never set them) are unaffected.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS points INTEGER;

CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- Widen the status workflow from todo/in_progress/done to the full
-- Linear-style set. The three old values are a subset of the new one,
-- so existing rows need no backfill. Points get their own constrained
-- set (1/2/3/5/8/13, the common story-point scale) instead of a plain
-- integer range. Both constraints are dropped and re-added on every
-- run (Postgres has no ADD CONSTRAINT IF NOT EXISTS) rather than named
-- defensively, which is cheap and keeps this file idempotent.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_points_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_points_check
  CHECK (points IS NULL OR points IN (1, 2, 3, 5, 8, 13));

-- Flat comment list per ticket.
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);

-- Every status transition a ticket goes through, so weekly completion
-- stats can be computed from *when a ticket moved into a terminal
-- status* rather than its current status - a ticket moved to done and
-- later reopened must still count as completed in the week it was
-- first (or most recently) marked done. Written by both the legacy
-- taskService and the new ticketService, since they share this table.
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket_id ON ticket_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status_history_to_status_changed_at ON ticket_status_history(to_status, changed_at);
