"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { IS_DEMO } from "@/lib/config";
import { backend } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { OwlMark, Wordmark } from "@/components/shell/logo";

const STAGES = ["Lead novo", "Primeiro contato", "Qualificação", "Proposta", "Fechado"];

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const error = await backend.signIn(email.trim(), pass);
    if (error) {
      setErr(error);
      setPass("");
      setBusy(false);
      return;
    }
    router.replace("/painel");
  }

  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-navy-ink lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <OwlMark className="size-10" />
          <div className="leading-tight">
            <Wordmark className="block text-xl text-white" />
            <span className="text-xs text-navy-ink-2">Gestão Empresarial Veterinária</span>
          </div>
        </div>

        <div className="my-auto max-w-lg">
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="font-display text-[44px] font-semibold leading-[1.04] tracking-[-0.03em] text-white">
            Do primeiro comentário ao contrato assinado.
          </motion.h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-navy-ink-2">Leads, follow-ups, abordagem e mentorias da equipe do Thiago Alemão num só lugar.</p>

          <ol className="mt-10 space-y-2">
            {STAGES.map((s, i) => (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.09, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <motion.span
                  className="h-2.5 rounded-full bg-[#3fc3b2]"
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - i * 17}%` }}
                  transition={{ delay: 0.35 + i * 0.09, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ opacity: 1 - i * 0.14, maxWidth: 260 }}
                />
                <span className="shrink-0 text-[13px] text-navy-ink-2">{s}</span>
              </motion.li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-navy-ink-2/70">Uso interno da equipe.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-5">
          <div className="flex items-center gap-2.5 lg:hidden">
            <OwlMark />
            <Wordmark className="text-ink" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">Entrar</h2>
            <p className="mt-1 text-sm text-ink-2">{IS_DEMO ? "Supabase não configurado: você vai entrar no modo demonstração." : "Use o e-mail e a senha cadastrados pelo administrador."}</p>
          </div>
          {!IS_DEMO && (
            <>
              <Field label="E-mail">
                <Input type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
              </Field>
              <Field label="Senha">
                <div className="relative">
                  <Input type={show ? "text" : "password"} autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:bg-sunken" aria-label={show ? "Esconder senha" : "Mostrar senha"}>
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
            </>
          )}
          {err && <p className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <>{IS_DEMO ? "Entrar na demonstração" : "Entrar"} <ArrowRight /></>}
          </Button>
          {!IS_DEMO && <p className="text-center text-xs text-ink-3">Novos acessos são convidados pelo Supabase. Peça ao Thiago.</p>}
        </motion.form>
      </section>
    </div>
  );
}
