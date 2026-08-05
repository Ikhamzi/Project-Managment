import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Avatar from './Avatar.jsx';
import { STATUSES, priorityMeta } from '../lib/ticketMeta.js';

export default function TicketCard({ ticket, members, onChanged, onOpen }) {
  const { api } = useApp();
  const [busy, setBusy] = useState(false);
  const assignee = members.find((m) => m.id === ticket.assignee_id);
  const priority = priorityMeta(ticket.priority);

  async function updateStatus(status) {
    setBusy(true);
    try {
      await api.updateTicket(ticket.id, { status });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md ${busy ? 'opacity-50' : ''}`}
    >
      <button
        onClick={() => onOpen(ticket)}
        className="mb-2 block w-full text-left text-sm font-medium text-slate-800 hover:text-slate-950"
      >
        {ticket.title}
      </button>
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.className}`}>{priority.label}</span>
        {ticket.points != null && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-50 px-1.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
            {ticket.points}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <select
          value={ticket.status}
          onChange={(e) => updateStatus(e.target.value)}
          disabled={busy}
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs text-slate-600"
        >
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        {assignee ? (
          <Avatar id={assignee.id} name={assignee.name} />
        ) : (
          <span
            title="Unassigned"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-300"
          >
            ?
          </span>
        )}
      </div>
    </div>
  );
}
