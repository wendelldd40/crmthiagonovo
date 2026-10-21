export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sem Supabase configurado, tudo roda no navegador com dados fictícios. */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const APP_NAME = "ThiagoCRM";
export const APP_TAGLINE = "Gestão Empresarial Veterinária";

/** Chaves da tabela `settings` (key/value) usadas pelo CRM. */
export const SETTING = {
  estagiarioObs: "estagiario_obs",
  eloAutoSync: "elo_autosync",
  eloEtiqueta: "elo_etiqueta_padrao",
  eloCadencia: "elo_cadencia_padrao",
  scriptGestor: "script_global_gestor",
  scriptAutonomo: "script_global_autonomo",
} as const;

/** Tag que marca leads importados da planilha (fora das métricas operacionais). */
export const TAG_PLANILHA = "planilha";
export const TAG_ABORDADO = "abordado";
/** Tag gravada no lead depois que ele foi enviado ao Elo. */
export const TAG_ELO = "elo";
