"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({ className, align = "end", ...props }: DM.DropdownMenuContentProps) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn("scroll-thin z-[70] max-h-[60vh] min-w-48 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop", className)}
        {...props}
      />
    </DM.Portal>
  );
}

export function MenuItem({ className, ...props }: DM.DropdownMenuItemProps) {
  return (
    <DM.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-sunken [&_svg]:size-4 [&_svg]:text-ink-3",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: DM.DropdownMenuLabelProps) {
  return <DM.Label className={cn("px-2.5 pb-1 pt-2 text-xs font-semibold text-ink-3", className)} {...props} />;
}

export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-line" />;
}
