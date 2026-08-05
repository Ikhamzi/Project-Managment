import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function NewTaskForm({ projectId, onCreated }) {
  const { api } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await api.createTask({
        projectId,
        title: title.trim(),
        priority,
        dueDate: dueDate || null,
        assignee: assignee || null,
      });
      setTitle('');
      setPriority('medium');
      setDueDate('');
      setAssignee('');
      setOpen(false);
      await onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700"
      >
        + New task
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3"
    >
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="Task title"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">Due date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">Assignee</label>
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="Optional"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
