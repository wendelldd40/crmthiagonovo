import Image from "next/image";
import { cn } from "@/lib/utils";
import simbolo from "@/assets/marca/simbolo.png";
import logoClaro from "@/assets/marca/logo-claro.png";
import logoEscuro from "@/assets/marca/logo-escuro.png";

/** Símbolo da marca Thiago Alemão (coruja-pena dourada) num quadrado azul-marinho. */
export function OwlMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-[#071a2e] ring-1 ring-[#c6a567]/35 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]", className)}>
      <Image src={simbolo} alt="" aria-hidden className="h-[74%] w-auto" priority />
    </span>
  );
}

/** Logo completa. `fundo="escuro"` = texto creme (sidebar, splash, login); `fundo="claro"` = texto azul-marinho. */
export function LogoCompleta({ fundo = "escuro", className }: { fundo?: "escuro" | "claro"; className?: string }) {
  return (
    <Image src={fundo === "escuro" ? logoClaro : logoEscuro} alt="Thiago Alemão · Gestão Empresarial Veterinária" className={cn("h-auto w-[260px]", className)} priority />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[17px] font-bold tracking-tight", className)}>
      Thiago<span className="font-medium opacity-70">CRM</span>
    </span>
  );
}
