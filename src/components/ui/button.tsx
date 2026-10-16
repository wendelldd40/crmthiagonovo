import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-bg active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-ink shadow-soft hover:bg-brand-strong dark:hover:bg-brand-strong",
        secondary: "border border-line bg-surface text-ink shadow-soft hover:border-line-strong hover:bg-surface-2",
        ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
        soft: "bg-brand-soft text-brand-strong hover:brightness-95",
        danger: "bg-coral text-white hover:brightness-95",
        "danger-ghost": "text-coral hover:bg-coral-soft",
        whatsapp: "bg-[#1fa855] text-white shadow-soft hover:bg-[#178a45]",
      },
      size: {
        xs: "h-7 rounded-lg px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-9",
        "icon-sm": "size-8 rounded-lg",
        "icon-xs": "size-7 rounded-lg [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : (type ?? "button")} {...props} />;
}
