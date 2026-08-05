import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

const MCP_URL = `${window.location.origin}/mcp`;

function cliCommand(token) {
  return `claude mcp add --transport http project-manager ${MCP_URL} --header "Authorization: Bearer ${token}"`;
}

export default function McpAccessModal({ onClose }) {
  const { api } = useApp();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [freshToken, setFreshToken] = useState(null);

  async function refresh() {
    setTokens(await api.listMcpTokens());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const created = await api.createMcpToken(label);
    setFreshToken(created.token);
    setLabel('');
    await refresh();
  }

  async function handleRevoke(id) {
    await api.revokeMcpToken(id);
    await refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">MCP access</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Generate a personal token to let Claude Code, Claude Desktop, or claude.ai read and edit
          your projects and tasks here. Tokens only ever see your own data.
        </p>

        {freshToken && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-2 text-sm font-medium text-emerald-800">
              Token created - copy it now, it won't be shown again:
            </p>
            <code className="block break-all rounded bg-white p-2 text-xs text-slate-700">{freshToken}</code>
            <p className="mb-1 mt-3 text-sm font-medium text-emerald-800">Add it to Claude Code:</p>
            <code className="block break-all rounded bg-white p-2 text-xs text-slate-700">
              {cliCommand(freshToken)}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(cliCommand(freshToken))}
              className="mt-2 rounded-md border border-emerald-300 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
            >
              Copy command
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-5 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. laptop, claude desktop)"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Generate token
          </button>
        </form>

        <h3 className="mb-2 text-sm font-medium text-slate-700">Active tokens</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-slate-400">No tokens yet.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-700">{t.label}</p>
                  <p className="text-xs text-slate-400">
                    Created {new Date(t.created_at).toLocaleDateString()}
                    {t.last_used_at ? ` · last used ${new Date(t.last_used_at).toLocaleDateString()}` : ' · never used'}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(t.id)}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
