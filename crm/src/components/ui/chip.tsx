import { cn } from "@/lib/utils";

/** Etiqueta pequena colorida. `color` é qualquer cor CSS; o fundo é a mesma cor em 13%. */
export function Chip({ color = "var(--ink-3)", children, className, solid, title }: { color?: string; children: React.ReactNode; className?: string; solid?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-flex h-[22px] max-w-full items-center gap-1 truncate rounded-md px-1.5 text-[11.5px] font-semibold leading-none [&_svg]:size-3 [&_svg]:shrink-0", className)}
      style={solid ? { background: color, color: "#fff" } : { color, background: `color-mix(in oklab, ${color} 13%, transparent)` }}
    >
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: color }} />;
}
