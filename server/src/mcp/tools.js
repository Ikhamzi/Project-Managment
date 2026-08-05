// Tools = verbs the AI can invoke. Every handler here just calls into
// the same service-layer functions the Express routes use (see
// ../services/), so a task created by an AI client and a task created
// through the React UI go through identical validation and land in the
// identical Postgres rows.
import { z } from 'zod';
import * as projectService from '../services/projectService.js';
import * as taskService from '../services/taskService.js';
import * as teamService from '../services/teamService.js';
import * as ticketService from '../services/ticketService.js';
import * as commentService from '../services/commentService.js';
import * as statsService from '../services/statsService.js';
import { resolveUserId } from './context.js';

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const statusEnum = z.enum(['todo', 'in_progress', 'done']);
const priorityEnum = z.enum(['low', 'medium', 'high']);
const ticketStatusEnum = z.enum(ticketService.STATUSES);
const pointsEnum = z.union(ticketService.POINTS.map((p) => z.literal(p)));

export function registerTools(server) {
  server.registerTool(
    'list_projects',
    {
      title: 'List Projects',
      description: 'List every project you own.',
      inputSchema: {},
    },
    async () => {
      const userId = await resolveUserId();
      return textResult(await projectService.listProjects(userId));
    }
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create Project',
      description: 'Create a new project.',
      inputSchema: {
        name: z.string().describe('Project name'),
        description: z.string().optional().describe('Optional project description'),
      },
    },
    async ({ name, description }) => {
      const userId = await resolveUserId();
      return textResult(await projectService.createProject(userId, { name, description }));
    }
  );

  server.registerTool(
    'update_project',
    {
      title: 'Update Project',
      description: 'Update a project name and/or description.',
      inputSchema: {
        projectId: z.number().describe('ID of the project to update'),
        name: z.string().optional(),
        description: z.string().optional(),
      },
    },
    async ({ projectId, name, description }) => {
      const userId = await resolveUserId();
      const project = await projectService.updateProject(userId, projectId, { name, description });
      if (!project) throw new Error(`Project ${projectId} not found`);
      return textResult(project);
    }
  );

  server.registerTool(
    'delete_project',
    {
      title: 'Delete Project',
      description: 'Delete a project and all of its tasks.',
      inputSchema: { projectId: z.number() },
    },
    async ({ projectId }) => {
      const userId = await resolveUserId();
      const deleted = await projectService.deleteProject(userId, projectId);
      if (!deleted) throw new Error(`Project ${projectId} not found`);
      return textResult({ deleted: true, projectId });
    }
  );

  server.registerTool(
    'list_tasks',
    {
      title: 'List Tasks',
      description: 'List tasks, optionally filtered by project and/or status.',
      inputSchema: {
        projectId: z.number().optional().describe('Only tasks in this project'),
        status: statusEnum.optional().describe('Only tasks with this status'),
      },
    },
    async ({ projectId, status }) => {
      const userId = await resolveUserId();
      return textResult(await taskService.listTasks(userId, { projectId, status }));
    }
  );

  server.registerTool(
    'create_task',
    {
      title: 'Create Task',
      description: 'Create a new task inside a project.',
      inputSchema: {
        projectId: z.number().describe('ID of the project this task belongs to'),
        title: z.string().describe('Task title'),
        description: z.string().optional(),
        priority: priorityEnum.optional().describe('Defaults to medium'),
        dueDate: z.string().optional().describe('ISO date, e.g. 2026-08-12'),
        assignee: z.string().optional(),
      },
    },
    async (args) => {
      const userId = await resolveUserId();
      return textResult(await taskService.createTask(userId, args));
    }
  );

  server.registerTool(
    'update_task',
    {
      title: 'Update Task',
      description: 'Update any fields on an existing task, e.g. change its status, priority, or due date.',
      inputSchema: {
        taskId: z.number().describe('ID of the task to update'),
        title: z.string().optional(),
        description: z.string().optional(),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        dueDate: z.string().optional().describe('ISO date, e.g. 2026-08-12'),
        assignee: z.string().optional(),
      },
    },
    async ({ taskId, ...fields }) => {
      const userId = await resolveUserId();
      const task = await taskService.updateTask(userId, taskId, fields);
      if (!task) throw new Error(`Task ${taskId} not found`);
      return textResult(task);
    }
  );

  server.registerTool(
    'delete_task',
    {
      title: 'Delete Task',
      description: 'Delete a task.',
      inputSchema: { taskId: z.number() },
    },
    async ({ taskId }) => {
      const userId = await resolveUserId();
      const deleted = await taskService.deleteTask(userId, taskId);
      if (!deleted) throw new Error(`Task ${taskId} not found`);
      return textResult({ deleted: true, taskId });
    }
  );

  server.registerTool(
    'list_teams',
    {
      title: 'List Teams',
      description: 'List every team you are a member of.',
      inputSchema: {},
    },
    async () => {
      const userId = await resolveUserId();
      return textResult(await teamService.listTeams(userId));
    }
  );

  server.registerTool(
    'create_team',
    {
      title: 'Create Team',
      description: 'Create a new team. You become its first member.',
      inputSchema: {
        name: z.string().describe('Team name'),
      },
    },
    async ({ name }) => {
      const userId = await resolveUserId();
      return textResult(await teamService.createTeam(userId, { name }));
    }
  );

  server.registerTool(
    'add_team_member',
    {
      title: 'Add Team Member',
      description: "Add a user to a team by email. You must already be a member of the team. The user must have signed into the web app at least once.",
      inputSchema: {
        teamId: z.number().describe('ID of the team to add a member to'),
        email: z.string().describe('Email of the user to add'),
      },
    },
    async ({ teamId, email }) => {
      const userId = await resolveUserId();
      return textResult(await teamService.addTeamMember(userId, teamId, { email }));
    }
  );

  server.registerTool(
    'list_tickets',
    {
      title: 'List Tickets',
      description: 'List tickets across your teams, optionally filtered by project, team, assignee, and/or status.',
      inputSchema: {
        projectId: z.number().optional().describe('Only tickets in this project'),
        teamId: z.number().optional().describe('Only tickets on this team'),
        assigneeId: z
          .union([z.number(), z.literal('unassigned')])
          .optional()
          .describe('Only tickets assigned to this user id, or "unassigned"'),
        status: ticketStatusEnum.optional().describe('Only tickets with this status'),
      },
    },
    async ({ projectId, teamId, assigneeId, status }) => {
      const userId = await resolveUserId();
      return textResult(await ticketService.listTickets(userId, { projectId, teamId, assigneeId, status }));
    }
  );

  server.registerTool(
    'create_ticket',
    {
      title: 'Create Ticket',
      description: "Create a new ticket inside a project. The project must belong to one of your teams.",
      inputSchema: {
        projectId: z.number().describe('ID of the project this ticket belongs to'),
        title: z.string().describe('Ticket title'),
        description: z.string().optional().describe('Markdown description'),
        status: ticketStatusEnum.optional().describe('Defaults to backlog'),
        priority: priorityEnum.optional().describe('Defaults to medium'),
        points: pointsEnum.optional().describe('Story-point estimate: 1, 2, 3, 5, 8, or 13'),
        assigneeId: z.number().optional().describe('User id to assign, must be a member of the ticket\'s team'),
      },
    },
    async (args) => {
      const userId = await resolveUserId();
      return textResult(await ticketService.createTicket(userId, args));
    }
  );

  server.registerTool(
    'update_ticket',
    {
      title: 'Update Ticket',
      description: 'Update any fields on an existing ticket, e.g. change its status, assignee, points, or description.',
      inputSchema: {
        ticketId: z.number().describe('ID of the ticket to update'),
        title: z.string().optional(),
        description: z.string().optional().describe('Markdown description'),
        status: ticketStatusEnum.optional(),
        priority: priorityEnum.optional(),
        points: pointsEnum.nullable().optional().describe('Story-point estimate, or null to clear'),
        assigneeId: z.number().nullable().optional().describe('User id to assign, or null to unassign'),
      },
    },
    async ({ ticketId, ...fields }) => {
      const userId = await resolveUserId();
      const ticket = await ticketService.updateTicket(userId, ticketId, fields);
      if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
      return textResult(ticket);
    }
  );

  server.registerTool(
    'delete_ticket',
    {
      title: 'Delete Ticket',
      description: 'Delete a ticket.',
      inputSchema: { ticketId: z.number() },
    },
    async ({ ticketId }) => {
      const userId = await resolveUserId();
      const deleted = await ticketService.deleteTicket(userId, ticketId);
      if (!deleted) throw new Error(`Ticket ${ticketId} not found`);
      return textResult({ deleted: true, ticketId });
    }
  );

  server.registerTool(
    'list_comments',
    {
      title: 'List Comments',
      description: 'List every comment on a ticket, oldest first.',
      inputSchema: { ticketId: z.number() },
    },
    async ({ ticketId }) => {
      const userId = await resolveUserId();
      return textResult(await commentService.listComments(userId, ticketId));
    }
  );

  server.registerTool(
    'add_comment',
    {
      title: 'Add Comment',
      description: 'Add a markdown comment to a ticket.',
      inputSchema: {
        ticketId: z.number().describe('ID of the ticket to comment on'),
        body: z.string().describe('Comment body (markdown)'),
      },
    },
    async ({ ticketId, body }) => {
      const userId = await resolveUserId();
      return textResult(await commentService.addComment(userId, ticketId, { body }));
    }
  );

  server.registerTool(
    'get_weekly_stats',
    {
      title: 'Get Weekly Stats',
      description:
        'Tickets and points completed per week, broken down by team and assignee, across your teams. ' +
        '"Completed" is based on when a ticket was (most recently) moved to done in that week, not its ' +
        'current status, so past weeks stay accurate even if the ticket changes status again later.',
      inputSchema: {
        week: z.string().optional().describe('Any ISO date within the target week, e.g. 2026-08-06. Defaults to the current week.'),
        weeksBack: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('How many weeks to return, ending at `week`. Defaults to 1. Use 4-6 for a velocity trend.'),
      },
    },
    async ({ week, weeksBack }) => {
      const userId = await resolveUserId();
      return textResult(await statsService.getWeeklyStats(userId, { week, weeksBack }));
    }
  );
}
