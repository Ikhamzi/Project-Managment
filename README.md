# Task Manager (with an MCP server)

A small project & task manager - the kind of app that normally has one front door
(a browser talking to a REST API). This one has two: the same React app you'd
expect, and an [MCP](https://modelcontextprotocol.io) server that lets an AI
client (Claude Code, Claude Desktop, etc.) create, read, update and delete the
exact same projects and tasks, in the exact same Postgres database, by calling
tools and reading resources instead of clicking buttons.

```
"What's overdue on the Website Redesign project, and push anything
blocked on the client to next Friday."
```

Claude reads the `task://project/1` resource, sees the overdue items, calls
`update_task` a few times. Your Postgres rows change. Refresh the React app
and the changes are there - because both front doors call the same four
functions under the hood.

## Contents

- [How it's built](#how-its-built)
- [Features](#features)
- [Project structure](#project-structure)
- [Local setup](#local-setup)
- [Google sign-in setup](#google-sign-in-setup)
- [Using the MCP server](#using-the-mcp-server)
- [REST API reference](#rest-api-reference)
- [MCP tools & resources reference](#mcp-tools--resources-reference)
- [Docker](#docker)
- [Deploying to Render](#deploying-to-render)
- [Environment variables](#environment-variables)

## How it's built

**Stack:** React + Tailwind CSS (Vite) · Node.js + Express · PostgreSQL · MCP SDK

The idea this whole project is built around is **one house, two front doors**:

```
                        ┌─────────────────────┐
                        │   services/ layer    │
        ┌──────────────▶│  createTask()        │◀──────────────┐
        │               │  updateTask()  ...    │               │
        │               │  (all business logic) │               │
        │               └───────────┬───────────┘               │
        │                           │                            │
┌───────┴────────┐                  ▼                  ┌─────────┴────────┐
│  Express REST   │           ┌───────────┐             │    MCP server     │
│  routes         │           │ PostgreSQL │             │  (stdio, local)   │
│  (for the React │           └───────────┘             │  tools + resources │
│   app, browser) │                                      │  (for an AI client)│
└─────────────────┘                                      └───────────────────┘
```

`server/src/services/*.js` contains every piece of business logic (validation,
queries, ownership checks). `server/src/routes/*.js` (Express/REST, used by the
React app) and `server/src/mcp/*.js` (MCP tools/resources, used by an AI
client) are both thin wrappers around that same service layer - so a task
created through the UI and a task created by an AI assistant are validated,
stored, and shaped identically.

- **Tools** are verbs: `create_task`, `update_task`, etc. The AI calls them
  like functions, with JSON-schema-typed arguments.
- **Resources** are nouns, addressed by URI: `task://project/7`,
  `task://overdue`. The AI reads them into context instead of calling them.

## Features

- Projects and tasks: create, list, update, delete. Tasks have a title,
  description, status (`todo` / `in_progress` / `done`), priority
  (`low` / `medium` / `high`), due date, and assignee.
- Google sign-in. Each user only ever sees their own projects and tasks.
- **Try Demo** - anyone who isn't signed in can click "Try Demo" and use every
  feature immediately. Demo data lives entirely in the browser tab (not the
  database) and resets the moment the page is refreshed. In demo mode the
  navbar shows a sign-in button instead of a name, since there's no account
  behind it.
- An MCP server exposing the same functionality as tools (`create_task`,
  `list_tasks`, `update_task`, `delete_task`, and the project equivalents)
  and resources (`task://projects`, `task://project/{id}`, `task://overdue`)
  for a local AI client to use.
- **Teams and tickets**: a Linear-style layer on top of projects/tasks - teams,
  a team-scoped ticket board with points and a six-stage status workflow,
  markdown descriptions and comments, and a weekly stats dashboard with a
  velocity chart. Full React UI (below), REST API, and MCP tools.

## Teams and tickets

Built on top of the original projects/tasks foundation, not instead of it -
every existing route, service function and MCP tool listed above still
works exactly as before.

- **Teams** group users. Every user can belong to multiple teams; every
  project optionally belongs to one (required for *new* projects going
  forward - pre-existing projects keep working without one, they just
  can't have tickets created on them until assigned to a team). The sidebar's
  team switcher lets you create a team, switch between yours, and manage
  members (add by email) from a "👥" button next to it.
- **Tickets** are the same underlying rows as tasks (see
  `migrations/002_teams_tickets.sql` for why the table wasn't renamed),
  extended with `team_id`, `assignee_id` (must be a member of the
  ticket's team; unassigned is valid), and `points` (one of `1, 2, 3, 5,
  8, 13`). Status is a six-stage workflow shown as a 6-column kanban
  board: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`.
  Click a ticket to open its detail panel - inline-editable fields, a
  rendered-markdown description, and a comment thread.
- **Comments** are a flat, markdown list per ticket, rendered with
  `marked` + sanitized with `DOMPurify` before ever reaching the DOM.
- **Weekly stats** (`/stats` page, `get_weekly_stats` tool, or
  `GET /api/stats/weekly`) report tickets and points completed per week,
  broken down by team and assignee, plus a velocity chart across however
  many weeks you ask for (the UI shows the last 6). "Completed" is driven
  by a `ticket_status_history` table recording every status transition,
  not the ticket's current status - so a ticket marked done and later
  reopened still counts as completed in whichever week it was (most
  recently) marked done, even after later status changes.
- **Try Demo** covers all of this too - the seeded demo team, teammate,
  projects, tickets, and stats history all live in `client/src/api/demoApi.js`.

## Project structure

```
.
├── client/                  React + Vite + Tailwind frontend
│   └── src/
│       ├── api/             realApi.js (fetch) and demoApi.js (in-memory)
│       ├── context/         AppContext - auth state + demo mode + api switch
│       ├── lib/             markdown.js (marked + DOMPurify), ticketMeta.js (status/points/priority)
│       ├── components/      Navbar, ProjectSidebar (team switcher), TicketBoard, TicketCard,
│       │                    TicketDetail, NewTicketForm, TeamMembersModal, VelocityChart, ...
│       └── pages/           Welcome (signed-out), Dashboard (board), StatsPage
├── server/                  Express REST API + MCP server
│   └── src/
│       ├── services/        Shared business logic (projectService, taskService, teamService,
│       │                    ticketService, commentService, statsService, userService)
│       ├── routes/          Express routes - thin wrappers over services/
│       ├── mcp/             MCP server - tools.js, resources.js - same services/
│       ├── db.js            Postgres connection pool
│       ├── auth.js          JWT session helpers + requireAuth middleware
│       └── index.js         Express app entry point
│   └── migrations/          001_init.sql, 002_teams_tickets.sql - applied in order, every boot
├── docker-compose.yml       Postgres only, for local development
├── Dockerfile                Multi-stage build: client -> static files served by server
└── render.yaml               Render Blueprint (one web service + one Postgres database)
```

## Local setup

You'll need Node.js 20+ and Docker installed.

**1. Start Postgres:**

```bash
docker compose up -d
```

This runs Postgres in a container and automatically applies
`server/migrations/001_init.sql` the first time (creates the `users`,
`projects` and `tasks` tables). It listens on `localhost:5433` (not the usual
5432, in case you already have another Postgres running locally).

**2. Configure and start the server:**

```bash
cd server
npm install
cp .env.example .env
# edit .env - at minimum set JWT_SECRET to any random string.
# GOOGLE_CLIENT_ID can stay as the placeholder until you set up sign-in.
npm run dev
```

The API is now running at `http://localhost:4000`.

**3. Configure and start the client (in a second terminal):**

```bash
cd client
npm install
cp .env.example .env
# edit .env once you have a Google client ID (see next section)
npm run dev
```

Open `http://localhost:5173`. Click **Try the demo** to explore the app
immediately without setting up Google sign-in.

## Google sign-in setup

The app uses Google's ID-token sign-in flow (via
[`@react-oauth/google`](https://github.com/MomenSherif/react-oauth)): no
server-side redirect handling, no session middleware beyond a single JWT
cookie - just a button that hands the frontend a signed token, which the
backend verifies once and turns into its own session cookie.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create a project (or pick an existing one).
2. **APIs & Services → OAuth consent screen**: choose *External*, fill in an
   app name and your email, save. No special scopes needed.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173` (add your Render
     URL here too once you deploy)
4. Copy the generated **Client ID** into:
   - `server/.env` → `GOOGLE_CLIENT_ID`
   - `client/.env` → `VITE_GOOGLE_CLIENT_ID`
   (same value in both places)
5. Restart `npm run dev` in both `server/` and `client/`.

## Using the MCP server

There are three ways to connect an AI client - two remote (HTTPS, against a
deployed instance), one local (stdio, against your own Postgres). All three
call the exact same tools/resources over the same service layer.

### Remote, OAuth - Claude Desktop, claude.ai, "Add custom connector" UIs

The deployed app is a full OAuth 2.1 authorization server for its own MCP
endpoint (Dynamic Client Registration + Authorization Code + PKCE, see
`server/src/mcp/oauthProvider.js`). Client UIs that only take a URL (no field
for a raw token) use this automatically:

1. In Claude Desktop/claude.ai, add a custom connector with just the URL:
   `https://<your-deployment>/mcp`.
2. It opens your browser to sign in (if needed) and approve access - same
   Google account as the web app.
3. Done. No token to copy, no client ID/secret to fill in.

The token this issues under the hood is a normal personal access token (see
below) - it'll show up in, and can be revoked from, the same **MCP access**
panel.

### Remote, personal token - Claude Code, or any client with a header field

For clients that let you pass a static `Authorization` header (like Claude
Code's CLI), skip the OAuth dance and use a personal access token directly:

1. Sign in to the web app, click **MCP access** in the navbar, and generate a
   token (shown once - copy it).
2. Register it with your client:

   ```bash
   claude mcp add --transport http task-manager https://<your-deployment>/mcp \
     --header "Authorization: Bearer <token>"
   ```

Revoke a token any time from the same **MCP access** panel.

### Local (stdio) - your own machine, local Postgres

The stdio server (`server/src/mcp/server.js`) is meant to be launched by an
MCP client directly, not run by you. It shares your local Postgres, so it
needs to know *which* signed-up user's data to touch - set via the
`MCP_USER_EMAIL` environment variable, which must match a Google account
that has already signed into the web app at least once (that's what creates
the `users` row).

**Claude Desktop** - add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/absolute/path/to/server/src/mcp/server.js"],
      "env": {
        "DATABASE_URL": "postgresql://taskapp:taskapp@localhost:5433/taskapp",
        "MCP_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

**Claude Code** - from the `server/` directory:

```bash
claude mcp add task-manager --env DATABASE_URL=postgresql://taskapp:taskapp@localhost:5433/taskapp --env MCP_USER_EMAIL=you@example.com -- node src/mcp/server.js
```

Restart your MCP client, and try something like *"list my projects"* or
*"what's overdue?"*.

## REST API reference

All `/api/projects` and `/api/tasks` routes require the `session` cookie set
by `/api/auth/google` - the React app handles this automatically.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/google` | Body `{ credential }` (Google ID token). Verifies it, upserts the user, sets the session cookie. |
| GET | `/api/auth/me` | Returns the signed-in user, or 401. |
| POST | `/api/auth/logout` | Clears the session cookie. |
| GET | `/api/projects` | List your projects. |
| POST | `/api/projects` | Body `{ name, teamId, description? }`. |
| GET | `/api/projects/:id` | Get one project. |
| PATCH | `/api/projects/:id` | Body any of `{ name, description, teamId }`. |
| DELETE | `/api/projects/:id` | Deletes the project and its tasks. |
| GET | `/api/tasks?projectId=&status=` | List tasks, optionally filtered. |
| GET | `/api/tasks/overdue` | Tasks past their due date that aren't `done`. |
| POST | `/api/tasks` | Body `{ projectId, title, description?, priority?, dueDate?, assignee? }`. |
| GET | `/api/tasks/:id` | Get one task. |
| PATCH | `/api/tasks/:id` | Body any updatable task field. |
| DELETE | `/api/tasks/:id` | Deletes the task. |
| GET | `/api/teams` | List teams you're a member of. |
| POST | `/api/teams` | Body `{ name }`. Creates the team and adds you as its first member. |
| GET | `/api/teams/:id/members` | List a team's members. |
| POST | `/api/teams/:id/members` | Body `{ email }`. Adds an existing user to the team. |
| GET | `/api/tickets?projectId=&teamId=&assigneeId=&status=` | List tickets across your teams, optionally filtered. |
| POST | `/api/tickets` | Body `{ projectId, title, description?, status?, priority?, points?, assigneeId? }`. |
| GET | `/api/tickets/:id` | Get one ticket. |
| PATCH | `/api/tickets/:id` | Body any updatable ticket field. |
| DELETE | `/api/tickets/:id` | Deletes the ticket. |
| GET | `/api/tickets/:id/comments` | List a ticket's comments, oldest first. |
| POST | `/api/tickets/:id/comments` | Body `{ body }` (markdown). |
| GET | `/api/stats/weekly?week=&weeksBack=` | Tickets/points completed per week, by team and assignee. See "Teams and tickets" above. |

## MCP tools & resources reference

**Tools** (verbs - the AI calls these like functions):

| Tool | Arguments |
| --- | --- |
| `list_projects` | *(none)* |
| `create_project` | `name`, `description?` |
| `update_project` | `projectId`, `name?`, `description?` |
| `delete_project` | `projectId` |
| `list_tasks` | `projectId?`, `status?` |
| `create_task` | `projectId`, `title`, `description?`, `priority?`, `dueDate?`, `assignee?` |
| `update_task` | `taskId`, plus any field to change |
| `delete_task` | `taskId` |
| `list_teams` | *(none)* |
| `create_team` | `name` |
| `add_team_member` | `teamId`, `email` |
| `list_tickets` | `projectId?`, `teamId?`, `assigneeId?` (or `"unassigned"`), `status?` |
| `create_ticket` | `projectId`, `title`, `description?`, `status?`, `priority?`, `points?`, `assigneeId?` |
| `update_ticket` | `ticketId`, plus any field to change (`points`/`assigneeId` accept `null` to clear) |
| `delete_ticket` | `ticketId` |
| `list_comments` | `ticketId` |
| `add_comment` | `ticketId`, `body` |
| `get_weekly_stats` | `week?` (ISO date within the target week), `weeksBack?` (defaults to 1; use 4-6 for a velocity trend) |

**Resources** (nouns - the AI reads these into context by URI):

| URI | Returns |
| --- | --- |
| `task://projects` | All of your projects. |
| `task://project/{projectId}` | One project plus its full task list. |
| `task://overdue` | Every task past its due date that isn't `done`. |

## Docker

`docker-compose.yml` only runs Postgres - it keeps local development fast
(the server and client run natively with hot reload). The root `Dockerfile`
is the *production* image: a multi-stage build that compiles the React app
and packages it together with the Express server, so the whole thing deploys
as a single container that serves the API and the static frontend from the
same port. That's the image Render builds.

## Deploying to Render

This repo includes a `render.yaml` [Blueprint](https://render.com/docs/blueprint-spec),
so Render can set up both services for you automatically.

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com/): **New → Blueprint**,
   connect the repo. Render reads `render.yaml` and shows you a web service
   (`task-manager`, built from the root `Dockerfile`) and a database
   (`task-manager-db`). Click **Apply**.
3. The database's connection string is wired into the web service
   automatically (`DATABASE_URL`), and `JWT_SECRET` is generated for you.
4. You still need to set two values by hand (Render dashboard →
   `task-manager` → **Environment**), since they come from your own Google
   Cloud project: `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` (same value,
   the Client ID from the [Google sign-in setup](#google-sign-in-setup)
   section). Add your Render URL (`https://task-manager-xxxx.onrender.com`)
   to that OAuth client's **Authorized JavaScript origins** in Google Cloud
   Console.
5. `VITE_GOOGLE_CLIENT_ID` is baked into the frontend at build time, so after
   adding it, trigger **Manual Deploy → Deploy latest commit** once.
6. Visit the service URL. Sign in, or click **Try the demo**.

The database tables are created automatically the first time the server
boots (`index.js` runs the migration on startup - it's just
`CREATE TABLE IF NOT EXISTS`, so it's safe on every restart too). No shell
step needed, which matters on Render's free tier since it doesn't include
shell access.

That's the whole deployment - one web service, one database, no separate
static site or extra configuration to wire together.

## Environment variables

| Variable | Where | Description |
| --- | --- | --- |
| `DATABASE_URL` | server | Postgres connection string. |
| `PORT` | server | Port Express listens on (defaults to 4000; Render sets this itself). |
| `JWT_SECRET` | server | Random string used to sign session cookies. |
| `GOOGLE_CLIENT_ID` | server | Google OAuth Client ID, used to verify sign-in tokens. |
| `MCP_USER_EMAIL` | server (local stdio MCP only) | Which user's data the local MCP server operates on. Not used by the remote `/mcp` HTTP route - that authenticates per request with a personal token instead (see "Using the MCP server"). |
| `NODE_ENV` | server | Set to `production` to make Express serve the built client (done automatically in Docker/Render). |
| `PUBLIC_URL` | server | Externally-reachable base URL, used as the OAuth issuer for the remote MCP server. Defaults to Render's own `RENDER_EXTERNAL_URL` (set automatically there) or `http://localhost:$PORT`; only set explicitly on other hosts. |
| `VITE_GOOGLE_CLIENT_ID` | client | Same Google OAuth Client ID, used to render the sign-in button. |
