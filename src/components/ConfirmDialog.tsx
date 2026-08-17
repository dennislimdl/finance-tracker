"use client";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm animate-toast-in rounded-3xl border border-card-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold">{title}</p>
        {message && <p className="mt-1.5 text-sm text-muted">{message}</p>}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-card-border bg-input py-3 text-sm font-medium text-foreground transition active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-2 py-3 text-sm font-medium text-accent-foreground shadow-md transition active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
