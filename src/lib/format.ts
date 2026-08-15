const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const BRL_EXATO = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function brl(valor: number | null | undefined, exato = false) {
  const n = Number(valor ?? 0);
  return exato ? BRL_EXATO.format(n) : BRL.format(n);
}

/** Datas do Postgres vêm como "2026-08-15" — sem timezone, sem surpresa. */
export function comoData(iso: string | null | undefined) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function dataCurta(iso: string | null | undefined) {
  const d = comoData(iso);
  return d ? DATA_CURTA.format(d).replace(".", "") : "—";
}

export function dataLonga(iso: string | null | undefined) {
  const d = comoData(iso);
  return d ? DATA_LONGA.format(d) : "—";
}

export function hojeISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Dias corridos entre uma data e hoje. Positivo = passou. */
export function diasDesde(iso: string | null | undefined) {
  const d = comoData(iso);
  if (!d) return 0;
  const hoje = comoData(hojeISO())!;
  return Math.round((hoje.getTime() - d.getTime()) / 86_400_000);
}

/** Dias até uma data. Negativo = vencida. */
export function diasAte(iso: string | null | undefined) {
  return -diasDesde(iso);
}

/** R5 — atraso é derivado, nunca gravado. */
export function parcelaAtrasada(parcela: {
  vencimento: string | null;
  status: string;
}) {
  if (!parcela.vencimento) return false;
  if (parcela.status !== "prevista" && parcela.status !== "faturada")
    return false;
  return diasAte(parcela.vencimento) < 0;
}

export function prazoRelativo(iso: string | null | undefined) {
  const dias = diasAte(iso);
  if (!iso) return "sem prazo";
  if (dias < -1) return `${Math.abs(dias)} dias em atraso`;
  if (dias === -1) return "venceu ontem";
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `em ${dias} dias`;
}

export const ROTULO_ETAPA: Record<string, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  concluida: "Concluída",
};

export const ROTULO_COMERCIAL: Record<string, string> = {
  lead: "Lead",
  contato: "Contato",
  reuniao: "Reunião",
  briefing: "Briefing",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const ROTULO_PARCELA: Record<string, string> = {
  prevista: "Prevista",
  faturada: "Faturada",
  paga: "Paga",
  cancelada: "Cancelada",
};

export const ROTULO_TIPO: Record<string, string> = {
  residencial: "Residencial",
  corporativo: "Corporativo",
  retrofit: "Retrofit",
  interiores: "Interiores",
  outro: "Outro",
};
