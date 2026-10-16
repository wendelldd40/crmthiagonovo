"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Modal centralizado. Rodapé fixo: passe os botões em `footer`. */
export function Modal({ open, onOpenChange, title, description, children, footer, size = "md", className }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const w = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-[#051528]/45 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_160ms_ease-out] data-[state=closed]:animate-[fade-out_120ms_ease-in]" />
        <D.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] flex max-h-[min(92dvh,860px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-surface shadow-pop outline-none",
            "data-[state=open]:animate-[modal-in_220ms_cubic-bezier(.2,.9,.3,1.1)] data-[state=closed]:animate-[modal-out_140ms_ease-in]",
            w,
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <div className="min-w-0">
              <D.Title className="font-display text-lg font-semibold tracking-tight text-ink">{title}</D.Title>
              {description ? <D.Description className="mt-0.5 text-[13px] text-ink-3">{description}</D.Description> : <D.Description className="sr-only">{String(title)}</D.Description>}
            </div>
            <D.Close className="-mr-1 rounded-lg p-1.5 text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Fechar">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
