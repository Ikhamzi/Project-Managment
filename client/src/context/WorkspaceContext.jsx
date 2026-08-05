// Teams/projects/selection state, lifted out of Dashboard.jsx so both
// the desktop sidebar and the mobile drawer (MobileMenu.jsx) - which
// live in different parts of the tree and need to render the exact
// same team switcher + project list - read from one place instead of
// two copies drifting apart.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from './AppContext.jsx';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { api, user, demoMode } = useApp();
  const active = Boolean(user) || demoMode;

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
    if (!active) return;
    setLoading(true);
    Promise.all([loadTeams(), loadProjects()]).then(() => setLoading(false));
  }, [active, loadTeams, loadProjects]);

  const teamProjects = useMemo(() => projects.filter((p) => p.team_id === selectedTeamId), [projects, selectedTeamId]);

  useEffect(() => {
    setSelectedProjectId((current) => {
      if (current && teamProjects.some((p) => p.id === current)) return current;
      return teamProjects[0]?.id ?? null;
    });
    // Re-run only when the selected team or the project list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, projects]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;
  const selectedProject = teamProjects.find((p) => p.id === selectedProjectId) ?? null;

  const value = useMemo(
    () => ({
      loading,
      teams,
      selectedTeamId,
      setSelectedTeamId,
      selectedTeam,
      loadTeams,
      projects,
      teamProjects,
      selectedProjectId,
      setSelectedProjectId,
      selectedProject,
      loadProjects,
    }),
    [loading, teams, selectedTeamId, selectedTeam, loadTeams, projects, teamProjects, selectedProjectId, selectedProject, loadProjects]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
