// Small initials avatar used anywhere a user needs an identity badge
// (ticket cards, assignee pickers, comment authors, team member lists).
// Color is deterministic per user id, purely for visual variety - it
// isn't a data channel anything reads meaning from.
const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-600'];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0].toUpperCase();
}

export default function Avatar({ id, name, size = 'sm' }) {
  const color = COLORS[Math.abs(Number(id) || 0) % COLORS.length];
  const dims = size === 'xs' ? 'h-5 w-5 text-[10px]' : size === 'md' ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-[11px]';

  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${dims}`}
    >
      {initials(name)}
    </span>
  );
}
