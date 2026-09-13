import React, { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
      if (e.key === "Enter" && !loading) {
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    if (dialogRef.current) {
      const confirmBtn = dialogRef.current.querySelector(
        "[data-confirm]",
      ) as HTMLButtonElement;
      if (confirmBtn) confirmBtn.focus();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="p-6">
          <h2
            id="dialog-title"
            className="text-lg font-bold text-slate-900 dark:text-white mb-2"
          >
            {title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {message}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-confirm
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${
              destructive
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
