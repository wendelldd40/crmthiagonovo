import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHead({ title, subtitle, children, className }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-5 pb-3 pt-4", className)}>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[15.5px] font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ icon: Icon, title, children, className }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {Icon && (
        <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-sunken text-ink-3">
          <Icon className="size-5" />
        </span>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-ink-3">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "amber" | "coral" | "brand"; children: React.ReactNode; className?: string }) {
  const cls = {
    info: "bg-sky-soft text-sky",
    amber: "bg-amber-soft text-[#7a4d06] dark:text-amber",
    coral: "bg-coral-soft text-coral",
    brand: "bg-brand-soft text-brand-strong",
  }[tone];
  return <div className={cn("rounded-xl px-3.5 py-2.5 text-[13px] font-medium leading-relaxed", cls, className)}>{children}</div>;
}
