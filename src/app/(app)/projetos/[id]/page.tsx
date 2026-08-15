import { notFound } from "next/navigation";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { LinhaDimensao } from "@/components/linha-dimensao";
import { Selo, TituloPagina } from "@/components/bloco";
import { ListaEtapas } from "./lista-etapas";
import { PainelFinanceiro } from "./painel-financeiro";
import { CampoDrive } from "./campo-drive";
import { CadeiaCotas } from "./cadeia-cotas";
import { CarimboFolha } from "@/components/carimbo";
import { brl, dataLonga, diasAte, ROTULO_TIPO, comoData } from "@/lib/format";

export const dynamic = "force-dynamic";

type Etapa = {
  id: string;
  nome: string;
  ordem: number;
  prazo: string | null;
  status: string;
  data_entrega: string | null;
  data_aprovacao: string | null;
  tarefas: {
    id: string;
    titulo: string;
    concluida: boolean;
    prazo: string | null;
  }[];
};

/** R3 — quantos dias o projeto ficou parado esperando o cliente aprovar. */
export function diasDeEspera(etapa: {
  data_entrega: string | null;
  data_aprovacao: string | null;
}) {
  if (!etapa.data_entrega || !etapa.data_aprovacao) return null;
  const entrega = comoData(etapa.data_entrega)!;
  const aprovacao = comoData(etapa.data_aprovacao)!;
  return Math.max(
    0,
    Math.round((aprovacao.getTime() - entrega.getTime()) / 86_400_000),
  );
}

export default async function ProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  const [projetoRes, etapasRes, parcelasRes] = await Promise.all([
    supabase
      .from("projetos")
      .select(
        "id, nome, tipo_projeto, area_m2, valor_contrato, data_inicio, prazo_final, status, link_drive, clientes(nome, telefone)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("etapas")
      .select(
        "id, nome, ordem, prazo, status, data_entrega, data_aprovacao, tarefas(id, titulo, concluida, prazo)",
      )
      .eq("projeto_id", id)
      .order("ordem"),
    supabase
      .from("parcelas")
      .select("id, descricao, valor, vencimento, status, data_pagamento, etapa_id")
      .eq("projeto_id", id)
      .order("vencimento"),
  ]);

  const projeto = projetoRes.data as unknown as {
    id: string;
    nome: string;
    tipo_projeto: string;
    area_m2: number | null;
    valor_contrato: number;
    data_inicio: string;
    prazo_final: string | null;
    status: string;
    link_drive: string | null;
    clientes: { nome: string; telefone: string | null } | null;
  } | null;

  if (!projeto) notFound();

  const etapas = (etapasRes.data ?? []) as unknown as Etapa[];
  const parcelas = (parcelasRes.data ?? []) as unknown as {
    id: string;
    descricao: string;
    valor: number;
    vencimento: string | null;
    status: string;
    data_pagamento: string | null;
    etapa_id: string | null;
  }[];

  const recebido = parcelas
    .filter((p) => p.status === "paga")
    .reduce((s, p) => s + Number(p.valor), 0);

  const esperas = etapas
    .map(diasDeEspera)
    .filter((d): d is number => d !== null);
  const esperaTotal = esperas.reduce((s, d) => s + d, 0);

  const nomePorEtapa = new Map(etapas.map((e) => [e.id, e.nome]));

  const feitas = etapas.filter(
    (e) => e.status === "aprovada" || e.status === "concluida",
  ).length;
  const prazoEstourado =
    feitas < etapas.length &&
    projeto.prazo_final !== null &&
    diasAte(projeto.prazo_final) < 0;

  return (
    <div>
      <Link
        href="/projetos"
        className="dado mt-8 inline-block text-[10px] uppercase tracking-[0.16em] text-tinta-fraca transition-colors hover:text-tinta"
      >
        ← Projetos
      </Link>

      {/* Na área de desenho: o selo e o nome da obra. O carimbo com o
          contrato inteiro fica travado no canto, como na prancha. */}
      <TituloPagina
        folha={String(feitas).padStart(2, "0")}
        eyebrow={`${projeto.clientes?.nome ?? "Sem cliente"} · ${
          ROTULO_TIPO[projeto.tipo_projeto] ?? projeto.tipo_projeto
        }`}
        titulo={projeto.nome}
        acoes={
          <>
            <Selo tom={feitas === etapas.length ? "pronto" : "avanco"}>
              {feitas} de {etapas.length} etapas
            </Selo>
            <CampoDrive
              projetoId={projeto.id}
              valorInicial={projeto.link_drive}
            />
          </>
        }
      />

      <CarimboFolha
        folha={`${String(feitas).padStart(2, "0")}/${String(etapas.length).padStart(2, "0")}`}
        celulas={[
          // tira de uma linha só: o nome da obra e o cliente já estão grandes
          // na área de desenho, então aqui fica o que é contrato
          { rotulo: "Área", valor: projeto.area_m2 ? `${projeto.area_m2} m²` : "—" },
          { rotulo: "Contrato", valor: brl(projeto.valor_contrato) },
          { rotulo: "Recebido", valor: brl(recebido) },
          { rotulo: "Início", valor: dataLonga(projeto.data_inicio) },
          {
            rotulo: "Entrega",
            valor: dataLonga(projeto.prazo_final),
            furado: prazoEstourado,
          },
          {
            rotulo: "Espera cliente",
            valor: `${esperaTotal}d`,
            furado: esperaTotal > 15,
          },
        ]}
      />

      {/* O contrato desenhado: prazo cotado em cima, medição pendurada. */}
      <section className="mt-8">
        <h2 className="rotulo border-b border-traco pb-2">Cronograma cotado</h2>
        <div className="mt-5">
          <CadeiaCotas
            etapas={etapas}
            parcelas={parcelas}
            dataInicio={projeto.data_inicio}
          />
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section>
          <div className="flex items-baseline justify-between border-b border-traco pb-2">
            <h2 className="rotulo text-tinta-media">Etapas</h2>
            {esperaTotal > 0 ? (
              <span className="dado text-[10px] text-tinta-fraca">
                espera do cliente · {esperaTotal}d acumulados
              </span>
            ) : null}
          </div>
          <ListaEtapas projetoId={projeto.id} etapas={etapas} />
        </section>

        <aside className="pt-8 lg:border-l lg:border-traco lg:pl-10">
          <h2 className="rotulo border-b border-traco pb-2 text-tinta-media">
            Financeiro
          </h2>

          <div className="mt-5">
            <LinhaDimensao
              recebido={recebido}
              total={Number(projeto.valor_contrato)}
            />
          </div>

          <PainelFinanceiro
            projetoId={projeto.id}
            parcelas={parcelas}
            nomePorEtapa={Object.fromEntries(nomePorEtapa)}
          />

          {esperas.length > 0 ? (
            <div className="mt-9">
              <h3 className="rotulo border-b border-traco pb-2 text-tinta-media">
                Espera do cliente
              </h3>
              <ul className="mt-3 space-y-1.5">
                {etapas.map((e) => {
                  const d = diasDeEspera(e);
                  if (d === null) return null;
                  return (
                    <li
                      key={e.id}
                      className="flex items-baseline justify-between gap-3 text-[12px]"
                    >
                      <span className="truncate text-tinta-media">{e.nome}</span>
                      <Selo tom={d > 10 ? "alerta" : "nulo"}>{d}d</Selo>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-tinta-fraca">
                Dias entre a entrega e a aprovação. É o número que prova que o
                atraso não foi do escritório.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
