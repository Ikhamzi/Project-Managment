// Entirely in-memory implementation of the same functions realApi.js
// exposes. Used when someone clicks "Try Demo" instead of signing in -
// nothing here ever reaches the server or Postgres, and a page refresh
// wipes it back to the seed data below.
function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

let nextProjectId = 3;
let nextTaskId = 4;

let projects = [
  { id: 1, name: 'Website Redesign', description: 'Refresh the marketing site', created_at: new Date().toISOString() },
  { id: 2, name: 'Q3 Launch', description: 'Ship the Q3 feature set', created_at: new Date().toISOString() },
];

let tasks = [
  { id: 1, project_id: 1, title: 'Wireframe homepage', description: '', status: 'in_progress', priority: 'high', due_date: todayPlus(2), assignee: 'You', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, project_id: 1, title: 'Pick color palette', description: '', status: 'todo', priority: 'low', due_date: todayPlus(-1), assignee: 'You', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, project_id: 2, title: 'Write launch announcement', description: '', status: 'todo', priority: 'medium', due_date: todayPlus(5), assignee: 'You', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Small artificial delay so loading states behave the same as they do
// against the real network-backed API.
const delay = () => new Promise((r) => setTimeout(r, 150));

export const demoApi = {
  async listProjects() {
    await delay();
    return [...projects];
  },
  async createProject({ name, description = '' }) {
    await delay();
    const project = { id: nextProjectId++, name, description, created_at: new Date().toISOString() };
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
    tasks = tasks.filter((t) => t.project_id !== Number(id));
    return null;
  },

  async listTasks({ projectId, status } = {}) {
    await delay();
    return tasks.filter(
      (t) => (projectId ? t.project_id === Number(projectId) : true) && (status ? t.status === status : true)
    );
  },
  async createTask({ projectId, title, description = '', status = 'todo', priority = 'medium', dueDate = null, assignee = null }) {
    await delay();
    const task = {
      id: nextTaskId++,
      project_id: Number(projectId),
      title,
      description,
      status,
      priority,
      due_date: dueDate,
      assignee,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tasks = [task, ...tasks];
    return task;
  },
  async updateTask(id, fields) {
    await delay();
    const { dueDate, ...rest } = fields;
    tasks = tasks.map((t) =>
      t.id === Number(id)
        ? { ...t, ...rest, ...(dueDate !== undefined ? { due_date: dueDate } : {}), updated_at: new Date().toISOString() }
        : t
    );
    return tasks.find((t) => t.id === Number(id));
  },
  async deleteTask(id) {
    await delay();
    tasks = tasks.filter((t) => t.id !== Number(id));
    return null;
  },
};
