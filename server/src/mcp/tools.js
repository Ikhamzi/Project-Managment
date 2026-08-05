// Tools = verbs the AI can invoke. Every handler here just calls into
// the same service-layer functions the Express routes use (see
// ../services/), so a task created by an AI client and a task created
// through the React UI go through identical validation and land in the
// identical Postgres rows.
import { z } from 'zod';
import * as projectService from '../services/projectService.js';
import * as taskService from '../services/taskService.js';
import { resolveUserId } from './context.js';

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const statusEnum = z.enum(['todo', 'in_progress', 'done']);
const priorityEnum = z.enum(['low', 'medium', 'high']);

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
}
