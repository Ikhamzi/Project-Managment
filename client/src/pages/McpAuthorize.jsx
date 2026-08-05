import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../context/AppContext.jsx';
import { realApi } from '../api/realApi.js';

export default function McpAuthorize() {
  const { user, authLoading, signInWithGoogle } = useApp();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id');

  const [clientName, setClientName] = useState(null);
  const [error, setError] = useState(null);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (!user || !requestId) return;
    realApi
      .getOAuthRequest(requestId)
      .then((data) => setClientName(data.clientName))
      .catch((err) => setError(err.message));
  }, [user, requestId]);

  async function decide(approve) {
    setDeciding(true);
    try {
      const { redirectTo } = await realApi.decideOAuthRequest(requestId, approve);
      window.location.href = redirectTo;
    } catch (err) {
      setDeciding(false);
      setError(err.message);
    }
  }

  if (!requestId) {
    return <Centered>Missing authorization request. Go back to your MCP client and try connecting again.</Centered>;
  }

  if (authLoading) {
    return <Centered>Loading…</Centered>;
  }

  if (!user) {
    return (
      <Centered>
        <p className="mb-4 text-slate-600">Sign in to authorize this app to access your Task Manager account.</p>
        <GoogleLogin onSuccess={(res) => signInWithGoogle(res.credential)} onError={() => setError('Sign-in failed')} />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Centered>
    );
  }

  if (error) {
    return <Centered>{error}</Centered>;
  }

  if (!clientName) {
    return <Centered>Loading…</Centered>;
  }

  return (
    <Centered>
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-slate-800">Authorize access</h1>
        <p className="mb-6 text-sm text-slate-600">
          <span className="font-medium">{clientName}</span> wants to read and edit your projects and tasks as{' '}
          <span className="font-medium">{user.email}</span>.
        </p>
        <div className="flex gap-3">
          <button
            disabled={deciding}
            onClick={() => decide(true)}
            className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Allow
          </button>
          <button
            disabled={deciding}
            onClick={() => decide(false)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4 text-center">
      <div>{children}</div>
    </div>
  );
}
