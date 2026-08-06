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
    // md:h-full + md:flex-col makes the header/form below shrink-0 and
    // gives the ticket list its own scroll pane (md:overflow-y-auto)
    // instead of the whole page scrolling, so the navbar, sidebar, and
    // this project header stay visible while you scroll tickets.
    <div className="md:flex md:h-full md:min-h-0 md:flex-col">
      <div className="mb-6 flex items-start justify-between gap-4 md:mb-4 md:shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
          {project.description && <p className="mt-1 text-sm text-slate-500">{project.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {team.name}
        </span>
      </div>

      <div className="md:shrink-0">
        <NewTicketForm projectId={project.id} members={members} onCreated={loadTickets} />
      </div>

      {loading ? (
        <p className="mt-6 text-slate-400">Loading tickets…</p>
      ) : (
        // Sections stack top-to-bottom in workflow order (see
        // ticketMeta.js's STATUSES), so a status change always reads as
        // the ticket moving down the page when it progresses and up
        // when it's moved back - no columns, no horizontal scrolling,
        // which is also what makes this work on a phone screen.
        <div className="mt-6 space-y-5 md:mt-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:rounded-lg md:border md:border-slate-200 md:bg-white md:p-4 md:shadow-sm">
          {STATUSES.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.key);
            return (
              <section key={col.key} className="rounded-lg bg-slate-50 p-3 md:p-4">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                  {col.label}
                  <span className="font-normal normal-case text-slate-400">{colTickets.length}</span>
                </h3>
                {colTickets.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-slate-300">No tickets</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {colTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        members={members}
                        onChanged={loadTickets}
                        onOpen={(t) => setOpenTicketId(t.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
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
