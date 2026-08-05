// Desktop-only chrome - a fixed-width static column. On narrow screens
// this is hidden entirely: TeamSwitcher moves to a persistent bar at
// the top of the page (Dashboard.jsx) and ProjectList moves into the
// retractable MobileMenu drawer (see Navbar.jsx's hamburger button).
import TeamSwitcher from './TeamSwitcher.jsx';
import ProjectList from './ProjectList.jsx';

export default function ProjectSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <TeamSwitcher />
      <ProjectList />
    </aside>
  );
}
