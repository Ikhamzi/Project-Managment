// The team select/create/members block. Shared by the desktop sidebar
// (ProjectSidebar.jsx, at the top of the column) and, on mobile, a
// persistent bar at the top of the page (Dashboard.jsx) - team
// switching is common enough that it stays one tap away on mobile
// instead of being tucked inside the retractable drawer.
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import TeamMembersModal from './TeamMembersModal.jsx';

export default function TeamSwitcher({ compact = false }) {
  const { api } = useApp();
  const { teams, selectedTeamId, setSelectedTeamId, selectedTeam, loadTeams } = useWorkspace();

  const [teamName, setTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSubmitting(true);
    try {
      const team = await api.createTeam({ name: teamName.trim() });
      setTeamName('');
      setCreatingTeam(false);
      await loadTeams();
      setSelectedTeamId(team.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={compact ? '' : 'border-b border-slate-100 p-4'}>
      {!compact && <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Team</h2>}

      <div className="flex items-center gap-1.5">
        {teams.length > 0 && (
          <>
            <select
              value={selectedTeamId ?? ''}
              onChange={(e) => setSelectedTeamId(Number(e.target.value))}
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
          </>
        )}
        {compact && !creatingTeam && (
          <button
            onClick={() => setCreatingTeam(true)}
            className="shrink-0 rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            + New team
          </button>
        )}
      </div>

      {creatingTeam ? (
        <form onSubmit={handleCreateTeam} className={`flex gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
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
        !compact && (
          <button
            onClick={() => setCreatingTeam(true)}
            className="mt-2 w-full rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            + New team
          </button>
        )
      )}

      {showMembers && selectedTeam && <TeamMembersModal team={selectedTeam} onClose={() => setShowMembers(false)} />}
    </div>
  );
}
