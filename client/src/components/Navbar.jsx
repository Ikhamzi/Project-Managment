import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import McpAccessModal from './McpAccessModal.jsx';

// Two layouts in one header, toggled with Tailwind's `md:` breakpoint
// rather than JS - full branding + nav links + account actions on
// desktop; just a name and a hamburger on mobile, since there isn't
// room for all of that in a slim mobile bar. The hamburger opens
// MobileMenu.jsx (rendered at the App level), which carries the rest:
// nav links, the team/project switcher, and account actions.
export default function Navbar() {
  const { user, demoMode, signInWithGoogle, signOut, exitDemo, toggleMobileMenu } = useApp();
  const [mcpOpen, setMcpOpen] = useState(false);
  const location = useLocation();
  const showNav = Boolean(user) || demoMode;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-xl">📋</span>
        <span className="font-semibold text-slate-800">Project Manager</span>
        {demoMode && (
          <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Demo mode — nothing is saved
          </span>
        )}
        {showNav && (
          <nav className="ml-4 flex items-center gap-1 text-sm">
            <Link
              to="/"
              className={`rounded-md px-2.5 py-1 ${location.pathname === '/' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Board
            </Link>
            <Link
              to="/stats"
              className={`rounded-md px-2.5 py-1 ${location.pathname === '/stats' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Stats
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2 md:hidden">
        {showNav ? (
          <button
            onClick={toggleMobileMenu}
            aria-label="Open menu"
            className="rounded-md border border-slate-300 p-2 text-lg leading-none text-slate-600 hover:bg-slate-100"
          >
            ☰
          </button>
        ) : (
          <>
            <span className="text-xl">📋</span>
            <span className="font-semibold text-slate-800">Project Manager</span>
          </>
        )}
      </div>

      <div className="hidden items-center gap-3 md:flex">
        {user ? (
          <>
            <span className="text-sm font-medium text-slate-700">{user.name}</span>
            <button
              onClick={() => setMcpOpen(true)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              MCP access
            </button>
            <button
              onClick={signOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
            {mcpOpen && <McpAccessModal onClose={() => setMcpOpen(false)} />}
          </>
        ) : (
          <>
            {demoMode && (
              <button
                onClick={exitDemo}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Exit demo
              </button>
            )}
            <GoogleLogin
              onSuccess={(res) => signInWithGoogle(res.credential)}
              onError={() => console.error('Google sign-in failed')}
              size="medium"
              text="signin"
            />
          </>
        )}
      </div>

      <div className="md:hidden">
        {showNav ? (
          <span className="font-medium text-slate-800">{user?.name ?? 'Demo'}</span>
        ) : (
          <GoogleLogin
            onSuccess={(res) => signInWithGoogle(res.credential)}
            onError={() => console.error('Google sign-in failed')}
            size="medium"
            text="signin"
          />
        )}
      </div>
    </header>
  );
}
