// Stat tile: label + value + optional signed delta vs the prior week.
// See the dataviz skill's figures contract - proportional (non-tabular)
// figures for a standalone value like this.
export default function StatTile({ label, value, delta }) {
  const positive = delta > 0;
  const negative = delta < 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        {delta !== null && delta !== undefined && (
          <span className={`text-xs font-medium ${positive ? 'text-emerald-600' : negative ? 'text-red-500' : 'text-slate-400'}`}>
            {positive ? '↑' : negative ? '↓' : '·'} {Math.abs(delta)} vs last week
          </span>
        )}
      </div>
    </div>
  );
}
