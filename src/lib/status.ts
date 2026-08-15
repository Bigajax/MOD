/* =====================================================================
   Vocabulário de status.

   Um só lugar decide o peso de cada estado, porque a mesma etapa aparece em
   quatro telas e precisa ser a mesma coisa nas quatro.

   Não é paleta: é escala de tinta. `nulo` é papel quase limpo, `pronto` é
   tinta cheia, e o caminho entre os dois escurece. `alerta` é o único
   acento — atraso é risco e risco não pode parecer progresso.
   ===================================================================== */

export type Tom =
  | "nulo"
  | "inicio"
  | "meio"
  | "avanco"
  | "pronto"
  | "alerta";

/** Estilo inline do chip. Usa as variáveis de status do globals.css. */
export function chip(tom: Tom) {
  return {
    "--chip-bg": `var(--color-st-${tom})`,
    "--chip-tx": `var(--color-st-${tom}-tx)`,
  } as React.CSSProperties;
}

export const TOM_ETAPA: Record<string, Tom> = {
  nao_iniciada: "nulo",
  em_andamento: "meio",
  // aguardando aprovação recebe hachura por cima: está parado no cliente
  aguardando_aprovacao: "avanco",
  aprovada: "pronto",
  concluida: "pronto",
};

/** Etapa parada no cliente ganha hachura, não cor: é o estado que trava obra. */
export function etapaHachurada(status: string) {
  return status === "aguardando_aprovacao";
}

export const TOM_COMERCIAL: Record<string, Tom> = {
  lead: "nulo",
  contato: "inicio",
  reuniao: "inicio",
  briefing: "meio",
  proposta: "avanco",
  negociacao: "avanco",
  ganho: "pronto",
  perdido: "alerta",
};

export const TOM_PARCELA: Record<string, Tom> = {
  prevista: "nulo",
  faturada: "avanco",
  paga: "pronto",
  cancelada: "nulo",
};

/** Dias sem contato: R4 — 7 dias avisa, 14 alarma. */
export function tomParado(dias: number): Tom {
  if (dias >= 14) return "alerta";
  if (dias >= 7) return "avanco";
  return "nulo";
}
