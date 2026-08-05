import ProjectSidebar from '../components/ProjectSidebar.jsx';
import TicketBoard from '../components/TicketBoard.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';

export default function Dashboard() {
  const { loading, selectedTeam, selectedProject } = useWorkspace();

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <ProjectSidebar />
      <main className="flex-1 p-4 md:p-6">
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : !selectedTeam ? (
          <div className="mx-auto max-w-sm py-24 text-center">
            <span className="text-3xl">👋</span>
            <p className="mt-3 text-slate-500">
              Create a team to start tracking work.
              <span className="md:hidden"> Tap the menu in the top right to get started.</span>
              <span className="hidden md:inline"> Use the panel on the left to get started.</span>
            </p>
          </div>
        ) : selectedProject ? (
          <TicketBoard project={selectedProject} team={selectedTeam} />
        ) : (
          <p className="text-slate-400">Create a project to get started.</p>
        )}
      </main>
    </div>
  );
}
