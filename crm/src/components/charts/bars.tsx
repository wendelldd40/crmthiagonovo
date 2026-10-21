"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface BarItem {
  key: string;
  label: React.ReactNode;
  value: number;
  color: string;
  extra?: React.ReactNode;
}

/** Barras horizontais com rótulo, valor e animação de entrada. */
export function HBars({ items, max, className, empty = "Sem dados no período" }: { items: BarItem[]; max?: number; className?: string; empty?: string }) {
  const m = max ?? Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-[13px] text-ink-3">{empty}</p>;
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((it, i) => (
        <li key={it.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink-2">{it.label}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              {it.extra}
              <span className="tabular font-semibold text-ink">{it.value}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunken">
            <motion.div
              className="h-full rounded-full"
              style={{ background: it.color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(it.value ? 2 : 0, (it.value / m) * 100)}%` }}
              transition={{ delay: 0.05 * i, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Barra única dividida em partes proporcionais. */
export function SplitBar({ parts, className }: { parts: { value: number; color: string; label?: string }[]; className?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className={cn("flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-sunken", className)}>
      {total > 0 &&
        parts.map((p, i) =>
          p.value ? (
            <motion.div
              key={i}
              title={p.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ background: p.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(p.value / total) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
            />
          ) : null,
        )}
    </div>
  );
}

/** Colunas verticais (série mensal). */
export function Columns({ data, height = 150, format = (n: number) => String(n), highlight }: { data: { key: string; label: string; value: number; title?: string }[]; height?: number; format?: (n: number) => string; highlight?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 22);
          const hi = d.key === highlight;
          return (
            <div key={d.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={d.title ?? `${d.label}: ${format(d.value)}`}>
              <span className={cn("tabular text-[10.5px] font-semibold opacity-0 transition-opacity group-hover:opacity-100", hi ? "text-brand-strong opacity-100" : "text-ink-3")}>{d.value ? format(d.value) : ""}</span>
              <motion.div
                className={cn("w-full max-w-10 rounded-t-md", hi ? "bg-brand" : d.value ? "bg-brand/35" : "bg-sunken")}
                initial={{ height: 0 }}
                animate={{ height: Math.max(3, h) }}
                transition={{ delay: 0.035 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-2">
        {data.map((d) => (
          <span key={d.key} className={cn("flex-1 text-center text-[11px]", d.key === highlight ? "font-semibold text-brand-strong" : "text-ink-3")}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
