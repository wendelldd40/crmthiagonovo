"use client";
import * as T from "@radix-ui/react-tooltip";

export function Tip({ label, children, side = "top" }: { label: string; children: React.ReactNode; side?: "right" | "top" | "bottom" | "left" }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-[80] max-w-64 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-navy-ink shadow-pop">
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

export const TipProvider = T.Provider;
