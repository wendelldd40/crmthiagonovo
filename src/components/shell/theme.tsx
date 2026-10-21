"use client";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

/** Roda antes da pintura para não piscar o tema errado. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('crm-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

function current(): Theme {
  const set = document.documentElement.dataset.theme as Theme | undefined;
  if (set) return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  // renderizado só no navegador (o app espera a sessão antes de montar o menu)
  const [theme, setTheme] = useState<Theme>(() => (typeof window === "undefined" ? "light" : current()));
  function toggle() {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("crm-theme", next);
    } catch {}
    setTheme(next);
  }
  return (
    <button onClick={toggle} className={cn("grid size-8 place-items-center rounded-lg text-navy-ink-2 transition-colors hover:bg-white/8 hover:text-navy-ink", className)} aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} title={theme === "dark" ? "Tema claro" : "Tema escuro"}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
