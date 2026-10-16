"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Lock, RefreshCw, TriangleAlert } from "lucide-react";
import { CRMProvider, useCRM } from "@/lib/store";
import { ROLE_PAGES } from "@/lib/constants";
import { TipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LeadDrawer } from "@/components/crm/lead-drawer";
import { Dialogs } from "@/components/crm/dialogs";
import { Sidebar } from "./sidebar";
import { BottomNav, MobileTop } from "./mobile-nav";
import { CommandPalette } from "./command";
import { Toaster } from "./toaster";
import { NAV } from "./nav";
import { OwlMark } from "./logo";

function Splash() {
  return (
    <div className="grid h-dvh place-items-center bg-navy">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center gap-4">
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
          <OwlMark className="size-14 rounded-2xl" />
        </motion.div>
        <p className="text-sm text-navy-ink-2">Carregando os leads…</p>
      </motion.div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { ready, user, loadError, reload, can } = useCRM();
  const path = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState(false);

  useEffect(() => {
    if (ready && !user && !loadError) router.replace("/login");
  }, [ready, user, loadError, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || (!user && !loadError)) return <Splash />;

  if (loadError) {
    return (
      <div className="grid h-dvh place-items-center bg-bg p-6">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
          <TriangleAlert className="mx-auto mb-3 size-7 text-coral" />
          <p className="font-display text-lg font-semibold">Não foi possível carregar o CRM</p>
          <p className="mt-1 text-sm text-ink-2">{loadError}</p>
          <Button className="mt-5" onClick={() => void reload()}>
            <RefreshCw /> Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  const page = NAV.find((n) => path === n.href || path.startsWith(n.href + "/"));
  const allowed = !page || can(page.key);
  const home = NAV.find((n) => n.key === ROLE_PAGES[user!.role][0])?.href ?? "/painel";

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <Sidebar onSearch={() => setSearch(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTop onSearch={() => setSearch(true)} />
        <main className="scroll-thin min-h-0 flex-1 overflow-y-auto" id="main">
          <motion.div key={path} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="min-h-full">
              {allowed ? (
                children
              ) : (
                <div className="grid min-h-[70vh] place-items-center p-6 text-center">
                  <div>
                    <Lock className="mx-auto mb-3 size-7 text-ink-3" />
                    <p className="font-display text-lg font-semibold">Seu perfil não acessa esta área</p>
                    <Link href={home} className="mt-3 inline-block text-sm font-semibold text-brand">
                      Voltar ao início
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
        </main>
      </div>
      <BottomNav />
      <LeadDrawer />
      <Dialogs />
      <CommandPalette open={search} onOpenChange={setSearch} />
      <Toaster />
    </div>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <CRMProvider>
      <TipProvider>
        <Frame>{children}</Frame>
      </TipProvider>
    </CRMProvider>
  );
}
