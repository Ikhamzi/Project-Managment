// The project list + "new project" form for the selected team. Shared
// by the desktop sidebar (ProjectSidebar.jsx, below TeamSwitcher) and
// the mobile drawer (MobileMenu.jsx) - the team switcher itself lives
// outside this component (see TeamSwitcher.jsx).
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';

export default function ProjectList({ onNavigate }) {
  const { api } = useApp();
  const { selectedTeamId, selectedTeam, teamProjects, selectedProjectId, setSelectedProjectId, loadProjects } = useWorkspace();

  const [projectName, setProjectName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function selectProject(id) {
    setSelectedProjectId(id);
    onNavigate?.();
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!projectName.trim() || !selectedTeamId) return;
    setSubmitting(true);
    try {
      const project = await api.createProject({ name: projectName.trim(), teamId: selectedTeamId });
      setProjectName('');
      await loadProjects();
      selectProject(project.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProject(id) {
    if (!confirm('Delete this project and all its tickets?')) return;
    await api.deleteProject(id);
    await loadProjects();
    if (id === selectedProjectId) setSelectedProjectId(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Projects</h2>
      <ul className="mb-4 space-y-1">
        {teamProjects.map((project) => (
          <li key={project.id}>
            <button
              onClick={() => selectProject(project.id)}
              className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                project.id === selectedProjectId ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">{project.name}</span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
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
        {teamProjects.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-400">
            {selectedTeam ? 'No projects on this team yet' : 'Create a team to get started'}
          </li>
        )}
      </ul>

      {selectedTeam && (
        <form onSubmit={handleCreateProject} className="flex gap-2">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="New project"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !projectName.trim()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
