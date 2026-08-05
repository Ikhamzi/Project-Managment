// Desktop-only chrome around TeamProjectNav - a fixed-width static
// column. On narrow screens this is hidden entirely; the same content
// is reachable through the retractable MobileMenu drawer instead (see
// Navbar.jsx's hamburger button).
import TeamProjectNav from './TeamProjectNav.jsx';

export default function ProjectSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <TeamProjectNav />
    </aside>
  );
}
