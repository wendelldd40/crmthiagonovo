"use client";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useCRM } from "@/lib/store";

export function Toaster() {
  const { toasts, dismissToast } = useCRM();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-3 md:bottom-6 md:left-auto md:right-6 md:items-end" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = t.tone === "error" ? CircleAlert : t.tone === "info" ? Info : CircleCheck;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
              className="pointer-events-auto flex max-w-[420px] items-center gap-2.5 rounded-xl bg-navy py-2.5 pl-3 pr-2 text-[13.5px] font-medium text-navy-ink shadow-pop ring-1 ring-white/10"
            >
              <Icon className={t.tone === "error" ? "size-4 shrink-0 text-[#ff9a88]" : "size-4 shrink-0 text-[#5fd6c6]"} />
              <span className="flex-1">{t.text}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.run();
                    dismissToast(t.id);
                  }}
                  className="rounded-md px-2 py-1 text-[13px] font-semibold text-[#5fd6c6] hover:bg-white/10"
                >
                  {t.action.label}
                </button>
              )}
              <button onClick={() => dismissToast(t.id)} className="rounded-md p-1 text-navy-ink-2 hover:bg-white/10" aria-label="Fechar aviso">
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
