export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="inline-flex items-center gap-3 text-sm font-bold text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      {label}
    </div>
  );
}
