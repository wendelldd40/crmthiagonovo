import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, children, className }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-wrap items-end gap-x-4 gap-y-3 px-4 pb-4 pt-5 md:px-8 md:pt-7", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 pb-24 md:px-8 md:pb-10", className)}>{children}</div>;
}
