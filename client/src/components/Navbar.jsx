import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../context/AppContext.jsx';
import McpAccessModal from './McpAccessModal.jsx';

export default function Navbar() {
  const { user, demoMode, signInWithGoogle, signOut, exitDemo } = useApp();
  const [mcpOpen, setMcpOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">📋</span>
        <span className="font-semibold text-slate-800">Task Manager</span>
        {demoMode && (
          <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Demo mode — nothing is saved
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
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
    </header>
  );
}
