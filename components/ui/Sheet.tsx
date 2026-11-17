"use client";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

// Open sheets, newest last: Esc closes only the top one when sheets are stacked (e.g. share over a challenge).
const stack: object[] = [];

/** Bottom sheet on mobile, centered panel on desktop. Esc + backdrop close, focus moves in and back. */
export function Sheet({
  open,
  onClose,
  label,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  // Parents re-render every second (live clocks), so onClose changes identity constantly.
  // Keep it in a ref so the open/focus effect runs only when `open` changes.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const id = {};
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Move focus into the dialog only if the user hasn't already focused something inside it.
    const t = setTimeout(() => {
      if (panel.current && !panel.current.contains(document.activeElement)) panel.current.focus();
    }, 50);
    return () => {
      stack.splice(stack.indexOf(id), 1);
      document.removeEventListener("keydown", onKey);
      // Unlock scrolling only when the last open sheet closes (stacked sheets may close in any order).
      if (!stack.length) document.body.style.overflow = "";
      clearTimeout(t);
      lastFocus.current?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.button
            aria-label="Zamknij"
            tabIndex={-1}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={`relative max-h-[94dvh] w-full overflow-y-auto overflow-x-hidden overscroll-contain border-t border-line bg-ink outline-none sm:border ${
              wide ? "sm:max-w-2xl" : "sm:max-w-lg"
            }`}
          >
            <button
              onClick={onClose}
              aria-label="Zamknij"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center text-cream/60 hover:text-cream"
            >
              <X size={22} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
