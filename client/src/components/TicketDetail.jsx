import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Avatar from './Avatar.jsx';
import { renderMarkdown } from '../lib/markdown.js';
import { STATUSES, POINTS, PRIORITIES } from '../lib/ticketMeta.js';

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export default function TicketDetail({ ticket, members, onClose, onChanged }) {
  const { api } = useApp();
  const [title, setTitle] = useState(ticket.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(ticket.description || '');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(ticket.title);
    setDescription(ticket.description || '');
    setEditingDescription(false);
  }, [ticket.id, ticket.title, ticket.description]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    setComments(await api.listComments(ticket.id));
    setLoadingComments(false);
  }, [api, ticket.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function patch(fields) {
    setBusy(true);
    try {
      await api.updateTicket(ticket.id, fields);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleTitleBlur() {
    if (title.trim() && title.trim() !== ticket.title) await patch({ title: title.trim() });
  }

  async function handleSaveDescription() {
    await patch({ description });
    setEditingDescription(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this ticket?')) return;
    await api.deleteTicket(ticket.id);
    await onChanged();
    onClose();
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setBusy(true);
    try {
      await api.addComment(ticket.id, commentBody.trim());
      setCommentBody('');
      await loadComments();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Ticket #{ticket.id}</span>
          <div className="flex items-center gap-4">
            <button onClick={handleDelete} className="text-xs font-medium text-red-500 hover:text-red-700">
              Delete
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="mb-4 w-full rounded-md border border-transparent px-1 py-1 text-lg font-semibold text-slate-900 hover:border-slate-200 focus:border-slate-400 focus:outline-none"
          />

          <div className="mb-6 grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={ticket.status}
                disabled={busy}
                onChange={(e) => patch({ status: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={ticket.priority}
                disabled={busy}
                onChange={(e) => patch({ priority: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Points">
              <select
                value={ticket.points ?? ''}
                disabled={busy}
                onChange={(e) => patch({ points: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {POINTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select
                value={ticket.assignee_id ?? ''}
                disabled={busy}
                onChange={(e) => patch({ assigneeId: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mb-6">
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</h3>
              {!editingDescription && (
                <button onClick={() => setEditingDescription(true)} className="text-xs text-slate-500 hover:text-slate-800">
                  Edit
                </button>
              )}
            </div>
            {editingDescription ? (
              <div>
                <textarea
                  autoFocus
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Markdown supported"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={handleSaveDescription} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white">
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setDescription(ticket.description || '');
                      setEditingDescription(false);
                    }}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : ticket.description ? (
              <div
                className="prose prose-sm prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(ticket.description) }}
              />
            ) : (
              <p className="text-sm text-slate-400">No description yet.</p>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Comments {!loadingComments && `(${comments.length})`}
            </h3>
            {loadingComments ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <ul className="mb-3 space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <Avatar id={c.author_id} name={c.author_name} size="md" />
                    <div className="min-w-0 flex-1 rounded-md bg-slate-50 px-3 py-2">
                      <div className="mb-0.5 flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-slate-700">{c.author_name}</span>
                        <span className="text-[11px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <div
                        className="prose prose-sm prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body) }}
                      />
                    </div>
                  </li>
                ))}
                {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
              </ul>
            )}

            <form onSubmit={handleAddComment} className="flex flex-col gap-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                placeholder="Write a comment (markdown supported)…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !commentBody.trim()}
                className="self-end rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-40"
              >
                Comment
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
