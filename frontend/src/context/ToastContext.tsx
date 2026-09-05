import { useCallback, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';
import { ToastContext, type Toast, type ToastType } from './coreToast';

const toastStyles: Record<ToastType, { bg: string; icon: typeof Info }> = {
  success: { bg: 'bg-emerald-600', icon: CheckCircle2 },
  error: { bg: 'bg-red-600', icon: XCircle },
  info: { bg: 'bg-brand-600', icon: Info },
  warning: { bg: 'bg-amber-600', icon: AlertTriangle },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => {
            const style = toastStyles[toast.type];
            const Icon = style.icon;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex items-center gap-3 rounded-xl ${style.bg} px-5 py-3.5 text-sm font-semibold text-white shadow-glass-lg`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-xs">{toast.message}</span>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="ml-2 shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/20"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

