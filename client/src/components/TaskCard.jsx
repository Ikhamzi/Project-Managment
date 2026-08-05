import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

export default function TaskCard({ task, onChanged }) {
  const { api } = useApp();
  const [busy, setBusy] = useState(false);

  async function updateStatus(status) {
    setBusy(true);
    try {
      await api.updateTask(task.id, { status });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return;
    setBusy(true);
    try {
      await api.deleteTask(task.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm ${busy ? 'opacity-50' : ''}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">{task.title}</p>
        <button onClick={handleDelete} className="shrink-0 text-slate-300 hover:text-red-500" title="Delete task">
          ✕
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
        {task.due_date && (
          <span className={isOverdue(task) ? 'font-medium text-red-600' : 'text-slate-400'}>
            {isOverdue(task) ? 'Overdue: ' : 'Due '}
            {task.due_date}
          </span>
        )}
        {task.assignee && <span className="text-slate-400">@{task.assignee}</span>}
      </div>
      <select
        value={task.status}
        onChange={(e) => updateStatus(e.target.value)}
        disabled={busy}
        className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}
