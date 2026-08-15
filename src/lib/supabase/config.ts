export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Uma chave válida é JWT (legada) ou sb_publishable_… (nova). Qualquer outra
 *  coisa faz o Supabase devolver 401 em tudo — inclusive no login, que então
 *  reporta "senha errada" quando o problema é configuração. */
export function chaveConfigurada() {
  const k = SUPABASE_ANON_KEY.trim();
  if (!k) return false;
  if (k.startsWith("sb_publishable_")) return true;
  return k.startsWith("eyJ") && k.split(".").length === 3;
}

export function configOk() {
  return SUPABASE_URL.startsWith("http") && chaveConfigurada();
}
