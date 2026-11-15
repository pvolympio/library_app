import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastTone = "success" | "info" | "error";
interface ToastItem { id: number; message: string; tone: ToastTone }
interface ToastContextValue { notify: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastId = useRef(0);
  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    nextToastId.current += 1;
    const id = nextToastId.current;
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div key={toast.id} className={`product-toast toast-${toast.tone}`} initial={{ opacity: 0, y: 12, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
              <span aria-hidden="true">{toast.tone === "error" ? "!" : "✓"}</span>{toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return value;
}
