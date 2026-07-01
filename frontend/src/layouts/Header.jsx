export default function Header({ title = "Maintenance Management System", actions = null }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">MaintOps</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
