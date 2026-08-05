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

## Project structure

```
.
├── client/                  React + Vite + Tailwind frontend
│   └── src/
│       ├── api/             realApi.js (fetch) and demoApi.js (in-memory)
│       ├── context/         AppContext - auth state + demo mode + api switch
│       ├── components/      Navbar, ProjectSidebar, TaskBoard, TaskCard, ...
│       └── pages/           Welcome (signed-out), Dashboard (signed-in/demo)
├── server/                  Express REST API + MCP server
│   └── src/
│       ├── services/        Shared business logic (projectService, taskService, userService)
│       ├── routes/          Express routes - thin wrappers over services/
│       ├── mcp/             MCP server - tools.js, resources.js - same services/
│       ├── db.js            Postgres connection pool
│       ├── auth.js          JWT session helpers + requireAuth middleware
│       └── index.js         Express app entry point
│   └── migrations/001_init.sql
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

There are two ways to connect an AI client - local (stdio) against your own
Postgres, or remote (HTTPS) against a deployed instance using a personal
token. Both call the exact same tools/resources over the same service layer.

### Remote (HTTPS) - any signed-up user, no server config

The deployed app exposes the MCP server at `POST /mcp`, authenticated per
request with a personal access token instead of a shared secret - so anyone
who signs up gets their own token and only ever sees their own data.

1. Sign in to the web app, click **MCP access** in the navbar, and generate a
   token (shown once - copy it).
2. Register it with your client:

   ```bash
   claude mcp add --transport http task-manager https://<your-deployment>/mcp \
     --header "Authorization: Bearer <token>"
   ```

   **Claude Desktop** - add to `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "task-manager": {
         "type": "http",
         "url": "https://<your-deployment>/mcp",
         "headers": { "Authorization": "Bearer <token>" }
       }
     }
   }
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
| POST | `/api/projects` | Body `{ name, description? }`. |
| GET | `/api/projects/:id` | Get one project. |
| PATCH | `/api/projects/:id` | Body any of `{ name, description }`. |
| DELETE | `/api/projects/:id` | Deletes the project and its tasks. |
| GET | `/api/tasks?projectId=&status=` | List tasks, optionally filtered. |
| GET | `/api/tasks/overdue` | Tasks past their due date that aren't `done`. |
| POST | `/api/tasks` | Body `{ projectId, title, description?, priority?, dueDate?, assignee? }`. |
| GET | `/api/tasks/:id` | Get one task. |
| PATCH | `/api/tasks/:id` | Body any updatable task field. |
| DELETE | `/api/tasks/:id` | Deletes the task. |

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
| `VITE_GOOGLE_CLIENT_ID` | client | Same Google OAuth Client ID, used to render the sign-in button. |
