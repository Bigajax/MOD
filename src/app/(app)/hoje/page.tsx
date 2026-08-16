import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Bloco, TituloPagina } from "@/components/bloco";
import { CarimboFolha } from "@/components/carimbo";
import { AneisMod } from "@/components/aneis-mod";
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
  ROTULO_PARCELA,
} from "@/lib/format";
/* O cartão de pendência: miniatura do cartão de cor do manual — cabeça no
   fundo da família com os anéis no canto direito e o nome na cor, corpo em
   papel, pé de carimbo com duas células. Ferrugem na cabeça = atraso. */
function Cartao({
  href,
  cor,
  nome,
  detalhe,
  rotuloEsq,
  valorEsq,
  rotuloDir,
  valorDir,
  urgente,
}: {
  href: string;
  cor: string;
  nome: string;
  detalhe?: string;
  rotuloEsq: string;
  valorEsq: React.ReactNode;
  rotuloDir: string;
  valorDir: React.ReactNode;
  urgente?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-mod border border-traco bg-painel shadow-[0_1px_2px_0_rgba(0,0,0,0.08)] transition-[border-color] hover:border-traco-forte"
    >
      <div
        className="relative overflow-hidden px-4 pb-2.5 pt-3"
        style={{
          background: `var(--color-${cor}-fundo)`,
          color: `var(--color-${cor})`,
        }}
      >
        <AneisMod className="pointer-events-none absolute -right-12 top-1/2 w-48 -translate-y-1/2 opacity-[0.22]" />
        <p className="nome relative truncate text-[15px]">{nome}</p>
      </div>
      {detalhe ? (
        <div className="px-4 pb-3 pt-2.5">
          <p className="line-clamp-2 text-[12.5px] leading-snug text-tinta-media">
            {detalhe}
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 border-t border-tinta">
        <div className="border-r border-tinta px-4 py-2">
          <p className="carimbo-rot">{rotuloEsq}</p>
          <div className="carimbo-val">{valorEsq}</div>
        </div>
        <div className="px-4 py-2">
          <p className="carimbo-rot">{rotuloDir}</p>
          <div className={`carimbo-val ${urgente ? "text-ferrugem" : ""}`}>
            {valorDir}
          </div>
        </div>
      </div>
    </Link>
  );
}

/** A grade dos cartões de uma seção. */
function Cartoes({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}

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

  /* Uma linha só: o que precisa de atenção, sem prefixo e sem manual de uso. */
  const partes: string[] = [];
  if (followups.length > 0)
    partes.push(
      followups.length === 1
        ? "1 cliente esperando retorno"
        : `${followups.length} clientes esperando retorno`,
    );
  if (daSemana.length > 0)
    partes.push(
      daSemana.length === 1
        ? "1 prazo nesta semana"
        : `${daSemana.length} prazos nesta semana`,
    );
  if (totalAtrasado > 0) partes.push(`${brl(totalAtrasado)} a cobrar`);
  const resumo =
    partes.length === 0 ? "Nada pendente hoje." : partes.join("  ·  ");

  return (
    <div>
      <TituloPagina folha="01" eyebrow={data} titulo="Hoje" />

      <p className="mt-5 text-[14px] text-tinta-media">{resumo}</p>

      <CarimboFolha
        folha="01/04"
        celulas={[
          {
            rotulo: "Esperando retorno",
            valor: followups.length,
            cor: "ceu",
          },
          {
            rotulo: "Prazos estourados",
            valor: vencidas,
            furado: vencidas > 0,
            cor: "terra",
          },
          {
            rotulo: "Vencido a cobrar",
            valor: brl(totalAtrasado),
            furado: totalAtrasado > 0,
            cor: "natureza",
          },
          {
            rotulo: "Vencem em 7 dias",
            valor: daSemana.length - vencidas,
            cor: "terra",
          },
        ]}
      />

      <Bloco
        titulo="Esperando retorno"
        cor="azul"
        contagem={followups.length}
        vazio="Nenhum cliente esperando retorno."
      >
        <Cartoes>
          {followups.map((o) => {
            const parado = diasDesde(o.ultimo_contato);
            const urgente = parado >= 14;
            return (
              <Cartao
                key={o.id}
                href="/comercial"
                cor={urgente ? "ferrugem" : "azul"}
                nome={o.clientes?.nome ?? "Sem cliente"}
                detalhe={o.titulo}
                rotuloEsq={ROTULO_COMERCIAL[o.etapa] ?? o.etapa}
                valorEsq={<Valor reais={o.valor_proposta} tamanho={17} />}
                rotuloDir="Sem contato"
                valorDir={
                  parado <= 0
                    ? "falou hoje"
                    : parado === 1
                      ? "há 1 dia"
                      : `há ${parado} dias`
                }
                urgente={urgente}
              />
            );
          })}
        </Cartoes>
      </Bloco>

      <Bloco
        titulo="Prazos da semana"
        cor="argila"
        contagem={daSemana.length}
        vazio="Nada vencendo nos próximos 7 dias."
      >
        <Cartoes>
          {daSemana.map((e) => {
            const atrasada = diasAte(e.prazo) < 0;
            return (
              <Cartao
                key={e.id}
                href={`/projetos/${e.projeto_id}`}
                cor={atrasada ? "ferrugem" : "argila"}
                nome={e.projetos?.nome ?? "Projeto"}
                detalhe={
                  e.status === "aguardando_aprovacao"
                    ? `${e.nome} — parado no cliente`
                    : e.nome
                }
                rotuloEsq="Prazo"
                valorEsq={dataCurta(e.prazo)}
                rotuloDir="Situação"
                valorDir={prazoRelativo(e.prazo)}
                urgente={atrasada}
              />
            );
          })}
        </Cartoes>
      </Bloco>

      <Bloco
        titulo="A receber"
        cor="verde"
        contagem={financeiro.length}
        nota={totalAtrasado > 0 ? `${brl(totalAtrasado)} vencidos` : undefined}
        vazio="Nada vencido e nada vencendo em 15 dias."
      >
        <Cartoes>
          {financeiro.map((p) => {
            const atrasada = parcelaAtrasada(p);
            return (
              <Cartao
                key={p.id}
                href={`/projetos/${p.projeto_id}`}
                cor={atrasada ? "ferrugem" : "verde"}
                nome={p.projetos?.nome ?? "Projeto"}
                detalhe={p.descricao}
                rotuloEsq={ROTULO_PARCELA[p.status] ?? p.status}
                valorEsq={<Valor reais={p.valor} tamanho={17} />}
                rotuloDir="Vencimento"
                valorDir={
                  atrasada
                    ? prazoRelativo(p.vencimento)
                    : `vence ${dataCurta(p.vencimento)}`
                }
                urgente={atrasada}
              />
            );
          })}
        </Cartoes>
      </Bloco>
    </div>
  );
}
