import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const eloSecret = () => (process.env.ELO_WEBHOOK_SECRET ?? "").trim();

function igual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** `X-Elo-Signature: sha256=<hmac do corpo>` — o mesmo formato dos webhooks de saída do Elo. */
export function assinaturaValida(secret: string, corpo: string, assinatura: string | null) {
  return igual(assinatura ?? "", "sha256=" + createHmac("sha256", secret).update(corpo).digest("hex"));
}

/**
 * Chamadas do Elo ao CRM (ex.: listar funis): assina "GET <caminho> <timestamp>" e
 * só aceita até 5 minutos de diferença, para uma assinatura capturada não valer para sempre.
 */
export function chamadaDoEloValida(req: Request, caminho: string) {
  const secret = eloSecret();
  if (!secret) return { ok: false as const, status: 503, erro: "ELO_WEBHOOK_SECRET não configurado no CRM" };
  const ts = req.headers.get("x-elo-timestamp") ?? "";
  const n = Number(ts);
  if (!Number.isFinite(n) || Math.abs(Date.now() - n) > 5 * 60_000) return { ok: false as const, status: 401, erro: "Horário da chamada inválido" };
  if (!assinaturaValida(secret, `GET ${caminho} ${ts}`, req.headers.get("x-elo-signature"))) {
    return { ok: false as const, status: 401, erro: "Assinatura inválida" };
  }
  return { ok: true as const };
}
