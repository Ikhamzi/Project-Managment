import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import StatTile from '../components/StatTile.jsx';
import VelocityChart from '../components/VelocityChart.jsx';
import Avatar from '../components/Avatar.jsx';

const WEEKS_BACK = 6;

function formatRange(w) {
  const fmt = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `Week of ${fmt(w.weekStart)} – ${fmt(w.weekEnd)}`;
}

function Breakdown({ title, rows, showAvatar }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing completed this week yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-700">
                {showAvatar && typeof r.id === 'number' && <Avatar id={r.id} name={r.name} size="xs" />}
                {r.name}
              </span>
              <span className="text-slate-500">
                {r.ticketsCompleted} ticket{r.ticketsCompleted === 1 ? '' : 's'} · {r.pointsCompleted} pts
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StatsPage() {
  const { api } = useApp();
  const [weeks, setWeeks] = useState(null);

  useEffect(() => {
    api.getWeeklyStats({ weeksBack: WEEKS_BACK }).then((data) => setWeeks(data.weeks));
  }, [api]);

  if (!weeks) {
    return (
      <div className="p-6">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  const current = weeks[weeks.length - 1];
  const previous = weeks.length > 1 ? weeks[weeks.length - 2] : null;
  const ticketsDelta = previous ? current.ticketsCompleted - previous.ticketsCompleted : null;
  const pointsDelta = previous ? current.pointsCompleted - previous.pointsCompleted : null;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Weekly stats</h1>
      <p className="mb-6 text-sm text-slate-500">
        {formatRange(current)} · across every team you're a member of
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Tickets completed this week" value={current.ticketsCompleted} delta={ticketsDelta} />
        <StatTile label="Points completed this week" value={current.pointsCompleted} delta={pointsDelta} />
      </div>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Velocity</h2>
        <p className="mb-4 text-xs text-slate-400">Points completed per week, last {WEEKS_BACK} weeks</p>
        <VelocityChart weeks={weeks} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Breakdown title="By team" rows={current.byTeam} />
        <Breakdown title="By assignee" rows={current.byAssignee} showAvatar />
      </div>
    </div>
  );
}
