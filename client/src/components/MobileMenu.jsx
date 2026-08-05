// The retractable panel that replaces the desktop sidebar + navbar
// nav/account actions on narrow screens. Mounted once at the App level
// (not inside Dashboard) so it's reachable from every page, not just
// the board. Top: Board/Stats links + the project list (ProjectList,
// shared with the desktop sidebar - team switching itself lives in its
// own persistent bar at the top of the page, see Dashboard.jsx).
// Bottom: MCP access + Sign out (or Exit demo + sign-in for demo mode) -
// the same account actions the desktop navbar shows in its top-right.
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import ProjectList from './ProjectList.jsx';
import McpAccessModal from './McpAccessModal.jsx';

export default function MobileMenu() {
  const { user, demoMode, signInWithGoogle, signOut, exitDemo, mobileMenuOpen, closeMobileMenu } = useApp();
  const [mcpOpen, setMcpOpen] = useState(false);
  const location = useLocation();
  const showNav = Boolean(user) || demoMode;

  if (!showNav) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity md:hidden ${
          mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeMobileMenu}
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="text-xl">📋</span> Task Manager
          </span>
          <button onClick={closeMobileMenu} aria-label="Close menu" className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <nav className="flex gap-1 border-b border-slate-100 px-3 py-2 text-sm">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className={`rounded-md px-3 py-1.5 ${location.pathname === '/' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500'}`}
          >
            Board
          </Link>
          <Link
            to="/stats"
            onClick={closeMobileMenu}
            className={`rounded-md px-3 py-1.5 ${location.pathname === '/stats' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500'}`}
          >
            Stats
          </Link>
        </nav>

        <div className="min-h-0 flex-1">
          <ProjectList onNavigate={closeMobileMenu} />
        </div>

        <div className="border-t border-slate-100 p-3">
          {user ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMcpOpen(true)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                MCP access
              </button>
              <button
                onClick={signOut}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-stretch gap-2">
              <button
                onClick={exitDemo}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Exit demo
              </button>
              <GoogleLogin
                onSuccess={(res) => signInWithGoogle(res.credential)}
                onError={() => console.error('Google sign-in failed')}
                size="medium"
                text="signin"
              />
            </div>
          )}
        </div>
      </div>

      {mcpOpen && <McpAccessModal onClose={() => setMcpOpen(false)} />}
    </>
  );
}
