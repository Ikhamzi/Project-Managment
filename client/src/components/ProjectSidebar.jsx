import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function ProjectSidebar({ projects, selectedProjectId, onSelect, onProjectsChange }) {
  const { api } = useApp();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const project = await api.createProject({ name: name.trim() });
      setName('');
      await onProjectsChange();
      onSelect(project.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project and all its tasks?')) return;
    await api.deleteProject(id);
    await onProjectsChange();
    if (id === selectedProjectId) onSelect(null);
  }

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Projects</h2>
      <ul className="mb-4 space-y-1">
        {projects.map((project) => (
          <li key={project.id}>
            <button
              onClick={() => onSelect(project.id)}
              className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                project.id === selectedProjectId ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">{project.name}</span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(project.id);
                }}
                className={`ml-2 shrink-0 opacity-0 group-hover:opacity-100 ${
                  project.id === selectedProjectId ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-red-500'
                }`}
                title="Delete project"
              >
                ✕
              </span>
            </button>
          </li>
        ))}
        {projects.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No projects yet</li>}
      </ul>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </aside>
  );
}
