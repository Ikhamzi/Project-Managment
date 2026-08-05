// The team switcher + project list content, shared verbatim by the
// desktop sidebar (ProjectSidebar.jsx) and the mobile drawer
// (MobileMenu.jsx) - one implementation reading from WorkspaceContext,
// rendered in two different pieces of chrome.
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import TeamMembersModal from './TeamMembersModal.jsx';

export default function TeamProjectNav({ onNavigate }) {
  const { api } = useApp();
  const {
    teams,
    selectedTeamId,
    setSelectedTeamId,
    selectedTeam,
    loadTeams,
    teamProjects,
    selectedProjectId,
    setSelectedProjectId,
    loadProjects,
  } = useWorkspace();

  const [teamName, setTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function selectTeam(id) {
    setSelectedTeamId(id);
    onNavigate?.();
  }

  function selectProject(id) {
    setSelectedProjectId(id);
    onNavigate?.();
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSubmitting(true);
    try {
      const team = await api.createTeam({ name: teamName.trim() });
      setTeamName('');
      setCreatingTeam(false);
      await loadTeams();
      selectTeam(team.id);
    } finally {
      setSubmitting(false);
    }
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
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Team</h2>

        {teams.length > 0 && (
          <div className="mb-2 flex items-center gap-1.5">
            <select
              value={selectedTeamId ?? ''}
              onChange={(e) => selectTeam(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-800 focus:border-slate-500 focus:outline-none"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowMembers(true)}
              title="Team members"
              className="shrink-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              👥
            </button>
          </div>
        )}

        {creatingTeam ? (
          <form onSubmit={handleCreateTeam} className="flex gap-1.5">
            <input
              autoFocus
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !teamName.trim()}
              className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1.5 text-sm text-white disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setCreatingTeam(false)}
              className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreatingTeam(true)}
            className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            + New team
          </button>
        )}
      </div>

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

      {showMembers && selectedTeam && <TeamMembersModal team={selectedTeam} onClose={() => setShowMembers(false)} />}
    </div>
  );
}
