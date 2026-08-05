import { useState } from 'react';

// Single-series bar chart (points completed per week) per the dataviz
// skill: sequential blue, bars capped at 24px thick with a 4px rounded
// data-end and a square baseline, a hairline baseline axis, and a
// hover affordance - a native <title> per bar for a zero-JS-positioned
// tooltip, plus a "reading line" above the chart that always shows the
// hovered (or, by default, latest) week's numbers in text.
const BAR_COLOR = '#2a78d6';
const BAR_HOVER = '#1c5cab';
const AXIS_COLOR = '#c3c2b7';
const LABEL_COLOR = '#898781';

function shortDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function VelocityChart({ weeks }) {
  const [hovered, setHovered] = useState(null);
  const width = 560;
  const height = 200;
  const padding = { top: 8, right: 8, bottom: 24, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const baseline = height - padding.bottom;

  const maxPoints = Math.max(1, ...weeks.map((w) => w.pointsCompleted));
  const niceMax = Math.ceil(maxPoints / 5) * 5 || 5;
  const bandW = plotW / weeks.length;
  const barW = Math.min(24, bandW * 0.5);

  const reading = weeks[hovered ?? weeks.length - 1];

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{reading.pointsCompleted} pts</span>{' '}
        <span className="text-slate-400">·</span> {reading.ticketsCompleted} ticket{reading.ticketsCompleted === 1 ? '' : 's'}{' '}
        <span className="text-slate-400">· {shortDate(reading.weekStart)} – {shortDate(reading.weekEnd)}</span>
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Points completed per week">
        <line x1={padding.left} x2={width - padding.right} y1={baseline} y2={baseline} stroke={AXIS_COLOR} strokeWidth="1" />
        {weeks.map((w, i) => {
          const barH = Math.max((w.pointsCompleted / niceMax) * plotH, w.pointsCompleted > 0 ? 4 : 0);
          const cx = padding.left + bandW * i + bandW / 2;
          const x = cx - barW / 2;
          const y = baseline - barH;
          const active = hovered === i;
          const color = active ? BAR_HOVER : BAR_COLOR;
          return (
            <g key={w.weekStart}>
              {barH > 0 && (
                <>
                  <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} />
                  <rect x={x} y={baseline - 4} width={barW} height={4} fill={color} />
                </>
              )}
              <text x={cx} y={baseline + 15} textAnchor="middle" fontSize="10" fill={LABEL_COLOR}>
                {shortDate(w.weekStart)}
              </text>
              <rect
                x={padding.left + bandW * i}
                y={padding.top}
                width={bandW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>
                  {shortDate(w.weekStart)} – {shortDate(w.weekEnd)}: {w.pointsCompleted} pts, {w.ticketsCompleted} tickets
                </title>
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
