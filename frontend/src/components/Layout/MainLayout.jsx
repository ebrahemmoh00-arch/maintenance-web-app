export default function MainLayout({ sidebar = null, header = null, children }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        {sidebar}
        <main className="min-w-0 flex-1 overflow-x-auto">
          {header}
          {children}
        </main>
      </div>
    </div>
  );
}
