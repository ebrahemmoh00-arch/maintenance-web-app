export function LineChart({ data, color = "#2563eb" }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 92 - (item.value / max) * 76;
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox="0 0 100 100" className="h-56 w-full overflow-visible">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        <polyline points={`0,92 ${points.join(" ")} 100,92`} fill="url(#lineFill)" stroke="none" />
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((item, index) => {
          const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
          const y = 92 - (item.value / max) * 76;
          return <circle key={item.label} cx={x} cy={y} r="2.3" fill="#fff" stroke={color} strokeWidth="1.5" />;
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
        {data.map((item) => <span key={item.label}>{item.label}</span>)}
      </div>
    </div>
  );
}

export function BarChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="flex h-56 items-end gap-5">
      {data.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
          <div className="flex h-40 w-full items-end rounded-t-lg bg-slate-100">
            <div
              className={`w-full rounded-t-lg ${item.color || "bg-blue-600"}`}
              style={{ height: `${Math.max((item.value / max) * 100, 6)}%` }}
              title={`${item.label}: ${item.value}`}
            />
          </div>
          <div className="w-full text-center">
            <p className="text-lg font-black text-slate-900">{item.value}</p>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" title={item.label}>{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, centerLabel = "Assets" }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 25;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 42 42" className="h-44 w-44 shrink-0">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
        {data.map((item) => {
          const dash = (item.value / total) * 100;
          const circle = (
            <circle
              key={item.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={item.color}
              strokeWidth="6"
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
            />
          );
          offset -= dash;
          return circle;
        })}
        <text x="21" y="20" textAnchor="middle" className="fill-slate-900 text-[0.35rem] font-black">
          {total}
        </text>
        <text x="21" y="25" textAnchor="middle" className="fill-slate-500 text-[0.18rem] uppercase">
          {centerLabel}
        </text>
      </svg>
      <div className="flex-1 space-y-3">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium text-slate-600">{item.label}</span>
            </div>
            <span className="text-sm font-black text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
