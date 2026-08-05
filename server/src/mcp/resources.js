// Resources = nouns the AI can read into context without invoking a
// function, addressed by URI instead. Same service layer as the tools
// and the REST routes - just wrapped for read-only, URI-shaped access.
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as projectService from '../services/projectService.js';
import * as taskService from '../services/taskService.js';
import { resolveUserId } from './context.js';

function jsonContents(uri, data) {
  return { contents: [{ uri: uri.href ?? uri, text: JSON.stringify(data, null, 2), mimeType: 'application/json' }] };
}

export function registerResources(server) {
  server.registerResource(
    'all-projects',
    'task://projects',
    { title: 'All projects', description: 'Every project you own, without their tasks.' },
    async (uri) => {
      const userId = await resolveUserId();
      return jsonContents(uri, await projectService.listProjects(userId));
    }
  );

  server.registerResource(
    'project-tasks',
    new ResourceTemplate('task://project/{projectId}', { list: undefined }),
    { title: 'Project tasks', description: 'A single project plus its full task list.' },
    async (uri, { projectId }) => {
      const userId = await resolveUserId();
      const project = await projectService.getProject(userId, projectId);
      if (!project) throw new Error(`Project ${projectId} not found`);
      const tasks = await taskService.listTasks(userId, { projectId });
      return jsonContents(uri, { project, tasks });
    }
  );

  server.registerResource(
    'overdue-tasks',
    'task://overdue',
    { title: 'Overdue tasks', description: 'Every task past its due date that is not marked done.' },
    async (uri) => {
      const userId = await resolveUserId();
      return jsonContents(uri, await taskService.listOverdueTasks(userId));
    }
  );
}
