import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import ProjectSidebar from '../components/ProjectSidebar.jsx';
import TicketBoard from '../components/TicketBoard.jsx';

export default function Dashboard() {
  const { api } = useApp();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    const data = await api.listTeams();
    setTeams(data);
    setSelectedTeamId((current) => (current && data.some((t) => t.id === current) ? current : data[0]?.id ?? null));
  }, [api]);

  const loadProjects = useCallback(async () => {
    setProjects(await api.listProjects());
  }, [api]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTeams(), loadProjects()]).then(() => setLoading(false));
  }, [loadTeams, loadProjects]);

  const teamProjects = projects.filter((p) => p.team_id === selectedTeamId);

  useEffect(() => {
    setSelectedProjectId((current) => {
      if (current && teamProjects.some((p) => p.id === current)) return current;
      return teamProjects[0]?.id ?? null;
    });
    // Re-run only when the selected team or the project list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, projects]);

  const selectedProject = teamProjects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <ProjectSidebar
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={setSelectedTeamId}
        onTeamsChange={loadTeams}
        projects={teamProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onProjectsChange={loadProjects}
      />
      <main className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : !selectedTeam ? (
          <div className="mx-auto max-w-sm py-24 text-center">
            <span className="text-3xl">👋</span>
            <p className="mt-3 text-slate-500">Create a team on the left to start tracking work.</p>
          </div>
        ) : selectedProject ? (
          <TicketBoard project={selectedProject} team={selectedTeam} />
        ) : (
          <p className="text-slate-400">Create a project on the left to get started.</p>
        )}
      </main>
    </div>
  );
}
