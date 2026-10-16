import { cn } from "@/lib/utils";

/** Coruja da marca Thiago Alemão (traço simplificado, herdado do CRM antigo). */
export function OwlMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#2d9d8f] to-[#3fc3b2] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]", className)}>
      <svg viewBox="0 0 40 40" className="size-[78%]" aria-hidden>
        <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 8C14 8 10 13 10 19c0 6 4 11 10 13 6-2 10-7 10-13 0-6-4-11-10-11Z" />
          <path d="M10 19c-2-3-1-8 3-10M30 19c2-3 1-8-3-10" />
          <circle cx="16.5" cy="17" r="2.2" />
          <circle cx="23.5" cy="17" r="2.2" />
          <path d="m18.5 20 1.5 2 1.5-2M15 9l-1.5-2.5M25 9l1.5-2.5M16 25c2 2 6 2 8 0" />
        </g>
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[17px] font-bold tracking-tight", className)}>
      Thiago<span className="font-medium opacity-70">CRM</span>
    </span>
  );
}
