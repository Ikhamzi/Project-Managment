import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Avatar from './Avatar.jsx';

export default function TeamMembersModal({ team, onClose }) {
  const { api } = useApp();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setMembers(await api.listTeamMembers(team.id));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      setMembers(await api.addTeamMember(team.id, email.trim()));
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{team.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Team members can be assigned tickets on this team's projects.</p>

        <form onSubmit={handleAdd} className="mb-2 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Add
          </button>
        </form>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Members {!loading && `(${members.length})`}
        </h3>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                <Avatar id={m.id} name={m.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="truncate text-xs text-slate-400">{m.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
