import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import ProjectSidebar from '../components/ProjectSidebar.jsx';
import TaskBoard from '../components/TaskBoard.jsx';

export default function Dashboard() {
  const { api } = useApp();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const data = await api.listProjects();
    setProjects(data);
    setSelectedProjectId((current) => {
      if (current && data.some((p) => p.id === current)) return current;
      return data[0]?.id ?? null;
    });
    setLoading(false);
  }, [api]);

  useEffect(() => {
    setLoading(true);
    loadProjects();
  }, [loadProjects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelect={setSelectedProjectId}
        onProjectsChange={loadProjects}
      />
      <main className="flex-1 p-6">
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : selectedProject ? (
          <TaskBoard project={selectedProject} />
        ) : (
          <p className="text-slate-400">Create a project on the left to get started.</p>
        )}
      </main>
    </div>
  );
}
