import { autorizar, SERVER_IS_DEMO } from "@/server/auth";
import { TIPOS_BUSCA, lugaresDoGoogle, relevante, type LugarGoogle, type TipoBusca } from "@/lib/importacao";

export const maxDuration = 30;

const KEY = (process.env.GOOGLE_PLACES_API_KEY ?? "").trim();
// Só os campos usados: cada campo a mais pode mudar a faixa de preço da Google.
const CAMPOS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber", "places.internationalPhoneNumber",
  "places.websiteUri", "places.googleMapsUri", "places.rating", "places.userRatingCount", "places.types", "places.businessStatus", "nextPageToken",
].join(",");

interface Pedido { regiao?: string; tipos?: TipoBusca[]; termo?: string; paginas?: Record<string, string> }

/**
 * POST /api/prospeccao/google
 * { regiao: "Aracaju - SE", tipos: ["clinicas","petshops"], termo?: "laboratório veterinário", paginas?: { [consulta]: pageToken } }
 * → { lugares: LugarGoogle[], paginas: { [consulta]: pageToken } }  (até 20 por consulta; até 60 no total por consulta)
 */
export async function POST(req: Request) {
  const auth = await autorizar(req);
  if (!auth.ok) return Response.json({ erro: auth.erro }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as Pedido;
  const regiao = String(body.regiao ?? "").trim().slice(0, 120);
  if (regiao.length < 3) return Response.json({ erro: "Informe a cidade ou região (ex.: Aracaju - SE)." }, { status: 400 });

  const consultas: { chave: string; texto: string; tipo?: string }[] = [];
  for (const t of TIPOS_BUSCA) if (body.tipos?.includes(t.key)) consultas.push({ chave: t.key, texto: `${t.termo} em ${regiao}`, tipo: t.tipoGoogle });
  const termo = String(body.termo ?? "").trim().slice(0, 80);
  if (termo) consultas.push({ chave: "termo", texto: `${termo} em ${regiao}` });
  if (!consultas.length) return Response.json({ erro: "Escolha pelo menos um tipo de negócio." }, { status: 400 });

  // "Carregar mais": só as consultas que ainda têm página seguinte
  const paginas = body.paginas ?? null;
  const rodar = paginas ? consultas.filter((c) => paginas[c.chave]) : consultas;

  if (!KEY) {
    if (SERVER_IS_DEMO) return Response.json(demo(regiao, rodar.map((c) => c.chave), !!paginas));
    return Response.json({ erro: "Busca no Google não configurada: cadastre GOOGLE_PLACES_API_KEY na Vercel e faça Redeploy." }, { status: 503 });
  }

  const resultados = await Promise.all(rodar.map(async (c) => {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": CAMPOS },
      body: JSON.stringify({
        textQuery: c.texto, languageCode: "pt-BR", regionCode: "BR", pageSize: 20,
        ...(c.tipo ? { includedType: c.tipo, strictTypeFiltering: true } : {}),
        ...(paginas?.[c.chave] ? { pageToken: paginas[c.chave] } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    }).catch(() => null);
    if (!res) return { chave: c.chave, erro: "O Google não respondeu." };
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (json as { error?: { message?: string; status?: string } }).error;
      const amigavel =
        res.status === 403 ? "Chave do Google sem permissão: ative a Places API (New) e o faturamento no Google Cloud." :
        res.status === 429 ? "Limite de buscas do Google atingido. Tente mais tarde." :
        msg?.message ?? `Google respondeu ${res.status}`;
      return { chave: c.chave, erro: amigavel };
    }
    return { chave: c.chave, lugares: lugaresDoGoogle(json), proxima: (json as { nextPageToken?: string }).nextPageToken ?? null };
  }));

  const erro = resultados.find((r) => "erro" in r && r.erro);
  if (erro && resultados.every((r) => "erro" in r)) return Response.json({ erro: (erro as { erro: string }).erro }, { status: 502 });

  const vistos = new Set<string>();
  const lugares: LugarGoogle[] = [];
  const proximas: Record<string, string> = {};
  for (const r of resultados) {
    if (!("lugares" in r) || !r.lugares) continue;
    if (r.proxima) proximas[r.chave] = r.proxima;
    for (const l of r.lugares) {
      if (vistos.has(l.id) || (r.chave === "termo" && !relevante(l))) continue;
      vistos.add(l.id);
      lugares.push(l);
    }
  }
  return Response.json({ lugares, paginas: proximas, aviso: erro ? (erro as { erro: string }).erro : undefined });
}

/** Modo demonstração (sem Supabase e sem chave do Google): resultados fictícios para testar a tela. */
function demo(regiao: string, chaves: string[], maisPagina: boolean) {
  const base = maisPagina ? 20 : 0;
  const nomes: Record<string, string[]> = {
    clinicas: ["Clínica Veterinária Bem-Estar", "Clínica Vet Amigo Fiel", "Centro Veterinário Patas", "Vet Care Clínica", "Clínica Animal Saúde"],
    hospitais: ["Hospital Veterinário 24h Vida", "Pronto Vet 24 Horas", "Hospital Vet Emergência"],
    petshops: ["Pet Shop Focinho Feliz", "Mundo Pet", "Banho & Tosa Cão Chic", "Pet Center Lucky"],
    termo: ["Laboratório Vet Diagnóstico"],
  };
  const lugares: LugarGoogle[] = chaves.flatMap((k) => (nomes[k] ?? []).map((nome, i) => {
    const n = base + i + (k.length * 7);
    const fixo = n % 3 === 0;
    const tel = fixo ? `5579321${String(10000 + n).slice(-5)}` : `55799${String(88000000 + n * 137).slice(-8)}`;
    return {
      id: `demo-${k}-${base + i}`, nome: base ? `${nome} (unid. 2)` : nome, endereco: `Rua das Flores, ${100 + n} - Centro, ${regiao}, Brasil`,
      telefone: fixo ? `(79) 3321-${tel.slice(-4)}` : `(79) 9${tel.slice(5, 9)}-${tel.slice(-4)}`, tel, tipoTel: fixo ? "fixo" as const : "celular" as const,
      site: i % 2 ? null : "https://exemplo.vet.br", maps: "https://maps.google.com/", nota: 4 + ((n % 10) / 10), avaliacoes: 20 + n * 3,
      tipos: [k === "petshops" ? "pet_store" : "veterinary_care"], aberto: true,
    };
  }));
  return { lugares, paginas: maisPagina ? {} : Object.fromEntries(chaves.map((k) => [k, "demo-pagina-2"])), simulado: true };
}
