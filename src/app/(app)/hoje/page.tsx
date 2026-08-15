import { criarClienteServidor } from "@/lib/supabase/server";
import { Bloco, LinhaRegistro, Selo, TituloPagina } from "@/components/bloco";
import { CarimboFolha } from "@/components/carimbo";
import { Valor } from "@/components/valor";
import {
  brl,
  dataCurta,
  diasDesde,
  diasAte,
  hojeISO,
  parcelaAtrasada,
  prazoRelativo,
  ROTULO_COMERCIAL,
  ROTULO_ETAPA,
  ROTULO_PARCELA,
} from "@/lib/format";
import {
  TOM_COMERCIAL,
  TOM_ETAPA,
  TOM_PARCELA,
  tomParado,
  etapaHachurada,
} from "@/lib/status";

export const dynamic = "force-dynamic";

function emDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function HojePage() {
  const supabase = await criarClienteServidor();
  const hoje = hojeISO();

  const [oportunidades, etapas, parcelas] = await Promise.all([
    supabase
      .from("oportunidades")
      .select(
        "id, titulo, valor_proposta, etapa, ultimo_contato, proximo_followup, clientes(nome)",
      )
      .not("etapa", "in", "(ganho,perdido)")
      .order("ultimo_contato", { ascending: true }),
    supabase
      .from("etapas")
      .select("id, nome, prazo, status, projeto_id, projetos(nome)")
      // Aprovada também é estado terminal: etapa aprovada não é pendência.
      .not("status", "in", "(concluida,aprovada)")
      .not("prazo", "is", null)
      .lte("prazo", emDias(hoje, 7))
      .order("prazo", { ascending: true }),
    supabase
      .from("parcelas")
      .select(
        "id, descricao, valor, vencimento, status, projeto_id, projetos(nome)",
      )
      .in("status", ["prevista", "faturada"])
      .not("vencimento", "is", null)
      .lte("vencimento", emDias(hoje, 15))
      .order("vencimento", { ascending: true }),
  ]);

  type Oportunidade = {
    id: string;
    titulo: string;
    valor_proposta: number | null;
    etapa: string;
    ultimo_contato: string;
    proximo_followup: string | null;
    clientes: { nome: string } | null;
  };

  const followups = ((oportunidades.data ?? []) as unknown as Oportunidade[])
    .filter(
      (o) =>
        (o.proximo_followup !== null && o.proximo_followup <= hoje) ||
        diasDesde(o.ultimo_contato) >= 7,
    )
    .sort((a, b) => diasDesde(b.ultimo_contato) - diasDesde(a.ultimo_contato));

  type Etapa = {
    id: string;
    nome: string;
    prazo: string;
    status: string;
    projeto_id: string;
    projetos: { nome: string } | null;
  };
  const daSemana = (etapas.data ?? []) as unknown as Etapa[];

  type Parcela = {
    id: string;
    descricao: string;
    valor: number;
    vencimento: string;
    status: string;
    projeto_id: string;
    projetos: { nome: string } | null;
  };
  const financeiro = ((parcelas.data ?? []) as unknown as Parcela[]).sort(
    (a, b) =>
      Number(parcelaAtrasada(b)) - Number(parcelaAtrasada(a)) ||
      a.vencimento.localeCompare(b.vencimento),
  );

  const totalAtrasado = financeiro
    .filter(parcelaAtrasada)
    .reduce((s, p) => s + Number(p.valor), 0);

  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  const vencidas = daSemana.filter((e) => diasAte(e.prazo) < 0).length;

  return (
    <div>
      <TituloPagina folha="01" eyebrow={data} titulo="Hoje" />

      <CarimboFolha
        folha="01/04"
        celulas={[
          {
            rotulo: "Follow-ups",
            valor: String(followups.length).padStart(2, "0"),
          },
          {
            rotulo: "Etapas vencidas",
            valor: String(vencidas).padStart(2, "0"),
            furado: vencidas > 0,
          },
          {
            rotulo: "Em atraso",
            valor: brl(totalAtrasado),
            furado: totalAtrasado > 0,
          },
          {
            rotulo: "Etapas 7 dias",
            valor: String(daSemana.length).padStart(2, "0"),
          },
        ]}
      />

      <Bloco
        titulo="Follow-ups"
        tom="meio"
        contagem={followups.length}
        vazio="Nenhuma oportunidade parada. O funil está em dia."
      >
        {followups.map((o) => {
          const parado = diasDesde(o.ultimo_contato);
          return (
            <LinhaRegistro
              key={o.id}
              href="/comercial"
              principal={o.clientes?.nome ?? "Sem cliente"}
              secundario={o.titulo}
              direita={
                <span className="flex items-center gap-4">
                  <span className="hidden sm:block">
                    <Valor reais={o.valor_proposta} tamanho={22} />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Selo tom={TOM_COMERCIAL[o.etapa] ?? "nulo"}>
                      {ROTULO_COMERCIAL[o.etapa] ?? o.etapa}
                    </Selo>
                    <Selo tom={tomParado(parado)}>{parado}d parado</Selo>
                  </span>
                </span>
              }
            />
          );
        })}
      </Bloco>

      <Bloco
        titulo="Etapas da semana"
        tom="avanco"
        contagem={daSemana.length}
        vazio="Nada vencendo nos próximos 7 dias."
      >
        {daSemana.map((e) => {
          const atrasada = diasAte(e.prazo) < 0;
          return (
            <LinhaRegistro
              key={e.id}
              href={`/projetos/${e.projeto_id}`}
              principal={e.projetos?.nome ?? "Projeto"}
              secundario={e.nome}
              direita={
                <span className="flex items-center gap-2.5">
                  <span className="dado hidden text-[13px] text-tinta-fraca sm:inline">
                    {dataCurta(e.prazo)}
                  </span>
                  <Selo
                    tom={TOM_ETAPA[e.status] ?? "nulo"}
                    hachura={etapaHachurada(e.status)}
                  >
                    {ROTULO_ETAPA[e.status] ?? e.status}
                  </Selo>
                  <Selo tom={atrasada ? "alerta" : "nulo"}>
                    {prazoRelativo(e.prazo)}
                  </Selo>
                </span>
              }
            />
          );
        })}
      </Bloco>

      <Bloco
        titulo="Financeiro"
        tom="pronto"
        contagem={financeiro.length}
        nota={totalAtrasado > 0 ? `${brl(totalAtrasado)} em atraso` : undefined}
        vazio="Nada vencido e nada vencendo em 15 dias."
      >
        {financeiro.map((p) => {
          const atrasada = parcelaAtrasada(p);
          return (
            <LinhaRegistro
              key={p.id}
              href={`/projetos/${p.projeto_id}`}
              principal={p.projetos?.nome ?? "Projeto"}
              secundario={p.descricao}
              direita={
                <span className="flex items-center gap-4">
                  <Valor reais={p.valor} tamanho={22} />
                  <span className="flex items-center gap-1.5">
                    <Selo tom={TOM_PARCELA[p.status] ?? "nulo"}>
                      {ROTULO_PARCELA[p.status] ?? p.status}
                    </Selo>
                    <Selo tom={atrasada ? "alerta" : "nulo"}>
                      {atrasada
                        ? prazoRelativo(p.vencimento)
                        : dataCurta(p.vencimento)}
                    </Selo>
                  </span>
                </span>
              }
            />
          );
        })}
      </Bloco>
    </div>
  );
}
