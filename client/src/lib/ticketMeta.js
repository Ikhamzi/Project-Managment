// Shared constants for the ticket workflow, mirroring the enums
// ticketService.js validates against on the server (STATUSES,
// PRIORITIES, POINTS) so the UI never offers a value the API would
// reject.
export const STATUSES = [
  { key: 'backlog', label: 'Backlog', dot: 'bg-slate-400' },
  { key: 'todo', label: 'Todo', dot: 'bg-blue-500' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-amber-500' },
  { key: 'in_review', label: 'In Review', dot: 'bg-violet-500' },
  { key: 'done', label: 'Done', dot: 'bg-emerald-500' },
  { key: 'cancelled', label: 'Cancelled', dot: 'bg-rose-400' },
];

export const POINTS = [1, 2, 3, 5, 8, 13];

export const PRIORITIES = [
  { key: 'low', label: 'Low', className: 'bg-slate-100 text-slate-600' },
  { key: 'medium', label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  { key: 'high', label: 'High', className: 'bg-red-100 text-red-700' },
];

export function priorityMeta(key) {
  return PRIORITIES.find((p) => p.key === key) ?? PRIORITIES[1];
}
