export function Toast({ toast }: { toast: { id: number; msg: string } | null }) {
  if (!toast) return null;
  return (
    <div key={toast.id} className="toast" role="status">
      {toast.msg}
    </div>
  );
}