import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import TaskCard from './TaskCard.jsx';
import NewTaskForm from './NewTaskForm.jsx';

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export default function TaskBoard({ project }) {
  const { api } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    const data = await api.listTasks({ projectId: project.id });
    setTasks(data);
    setLoading(false);
  }, [api, project.id]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
  }, [loadTasks]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
        {project.description && <p className="mt-1 text-sm text-slate-500">{project.description}</p>}
      </div>

      <NewTaskForm projectId={project.id} onCreated={loadTasks} />

      {loading ? (
        <p className="mt-6 text-slate-400">Loading tasks…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-lg bg-slate-100 p-3">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {col.label} ({tasks.filter((t) => t.status === col.key).length})
              </h3>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status === col.key)
                  .map((task) => (
                    <TaskCard key={task.id} task={task} onChanged={loadTasks} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
