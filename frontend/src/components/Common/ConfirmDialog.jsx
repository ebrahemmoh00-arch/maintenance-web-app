export default function ConfirmDialog({ open, title = "Confirm action", message = "Are you sure?", onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600" type="button">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white" type="button">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
