import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../context/AppContext.jsx';

export default function Welcome() {
  const { signInWithGoogle, startDemo } = useApp();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-24 text-center">
      <span className="text-4xl">📋</span>
      <h1 className="text-2xl font-bold text-slate-900">Project Manager</h1>
      <p className="text-slate-500">
        Simple project &amp; task tracking, plus an MCP server so an AI assistant can manage the same
        projects and tasks directly.
      </p>

      <div className="flex flex-col items-center gap-3">
        <GoogleLogin
          onSuccess={(res) => signInWithGoogle(res.credential)}
          onError={() => console.error('Google sign-in failed')}
        />
        <span className="text-xs text-slate-400">or</span>
        <button
          onClick={startDemo}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Try the demo — no sign-in required
        </button>
        <p className="max-w-xs text-xs text-slate-400">
          Demo mode lets you try every feature. Nothing you create is saved — it resets on refresh.
        </p>
      </div>
    </div>
  );
}
