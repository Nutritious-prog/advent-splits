"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Info, Lock } from "lucide-react";

type Kind = "success" | "error" | "info" | "lock";
interface ToastItem {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
}

const Ctx = createContext<(kind: Kind, title: string, body?: string) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

const ICON = { success: Check, error: AlertTriangle, info: Info, lock: Lock };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((kind: Kind, title: string, body?: string) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, kind, title, body }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3800);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),16px)]"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICON[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 border border-line bg-charcoal/95 px-4 py-3 shadow-2xl backdrop-blur"
                onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center ${
                    t.kind === "success" ? "bg-mustard text-ink" : t.kind === "error" ? "bg-danger text-ink" : "border border-line text-mustard"
                  }`}
                >
                  <Icon size={14} strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-sm text-cream/70">{t.body}</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
