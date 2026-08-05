import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import TicketCard from './TicketCard.jsx';
import NewTicketForm from './NewTicketForm.jsx';
import TicketDetail from './TicketDetail.jsx';
import { STATUSES } from '../lib/ticketMeta.js';

export default function TicketBoard({ project, team }) {
  const { api } = useApp();
  const [tickets, setTickets] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTicketId, setOpenTicketId] = useState(null);

  const loadTickets = useCallback(async () => {
    setTickets(await api.listTickets({ projectId: project.id }));
  }, [api, project.id]);

  const loadMembers = useCallback(async () => {
    setMembers(await api.listTeamMembers(team.id));
  }, [api, team.id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTickets(), loadMembers()]).then(() => setLoading(false));
  }, [loadTickets, loadMembers]);

  const openTicket = tickets.find((t) => t.id === openTicketId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
          {project.description && <p className="mt-1 text-sm text-slate-500">{project.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {team.name}
        </span>
      </div>

      <NewTicketForm projectId={project.id} members={members} onCreated={loadTickets} />

      {loading ? (
        <p className="mt-6 text-slate-400">Loading tickets…</p>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {STATUSES.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="w-72 shrink-0 rounded-lg bg-slate-50 p-3">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                  {col.label}
                  <span className="font-normal normal-case text-slate-400">{colTickets.length}</span>
                </h3>
                <div className="space-y-2">
                  {colTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      members={members}
                      onChanged={loadTickets}
                      onOpen={(t) => setOpenTicketId(t.id)}
                    />
                  ))}
                  {colTickets.length === 0 && <p className="px-1 py-2 text-xs text-slate-300">No tickets</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openTicket && (
        <TicketDetail ticket={openTicket} members={members} onClose={() => setOpenTicketId(null)} onChanged={loadTickets} />
      )}
    </div>
  );
}
