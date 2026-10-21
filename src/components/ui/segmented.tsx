"use client";
import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Seletor em pílulas com indicador animado. */
export function Segmented<T extends string>({ value, onChange, options, className, size = "md" }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div className={cn("inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-sunken p-1 scroll-thin", className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 rounded-lg font-semibold transition-colors",
              size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {active && <motion.span layoutId={id} className="absolute inset-0 rounded-lg bg-surface shadow-soft" transition={{ type: "spring", bounce: 0.18, duration: 0.4 }} />}
            <span className="relative z-10 inline-flex items-center gap-1.5 [&_svg]:size-3.5">{o.label}</span>
            {o.count != null && <span className="tabular relative z-10 text-[11.5px] font-medium text-ink-3">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
