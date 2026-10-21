"use client";
import * as S from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: S.SwitchProps) {
  return (
    <S.Root
      className={cn("relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-line-strong transition-colors data-[state=checked]:bg-brand disabled:opacity-50", className)}
      {...props}
    >
      <S.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </S.Root>
  );
}
