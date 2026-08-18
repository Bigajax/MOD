import Link from "next/link";
import { Selo } from "@/components/bloco";
import { Valor, FolhaBranca } from "@/components/valor";
import { Rolagem } from "@/components/rolagem";
import { brl, dataCurta, diasAte, ROTULO_TIPO } from "@/lib/format";
import { TOM_ETAPA, etapaHachurada, type Tom } from "@/lib/status";

export type EtapaProjeto = {
  nome: string;
  status: string;
  prazo: string | null;
  ordem: number;
};

export type ProjetoQuadro = {
  id: string;
  nome: string;
  tipo_projeto: string;
  valor_contrato: number;
  prazo_final: string | null;
  clientes: { nome: string } | null;
  etapas: EtapaProjeto[];
  parcelas: { valor: number; status: string }[];
};

const ENTREGUE = "Entregue";

function concluida(e: EtapaProjeto) {
  return e.status === "aprovada" || e.status === "concluida";
}

/** Onde o projeto estÃ¡: a primeira etapa que ainda nÃ£o fechou. */
function etapaAtual(p: ProjetoQuadro) {
  const ordenadas = [...p.etapas].sort((a, b) => a.ordem - b.ordem);
  return ordenadas.find((e) => !concluida(e)) ?? null;
}

export function QuadroProjetos({ projetos }: { projetos: ProjetoQuadro[] }) {
  // As colunas sÃ£o as etapas que existem de verdade nos contratos abertos,
  // na ordem do template. Nada de coluna vazia inventada.
  const porColuna = new Map<string, { ordem: number; itens: ProjetoQuadro[] }>();

  for (const p of projetos) {
    const atual = etapaAtual(p);
    const chave = atual?.nome ?? ENTREGUE;
    const ordem = atual?.ordem ?? 99;
    const alvo = porColuna.get(chave) ?? { ordem, itens: [] };
    alvo.ordem = Math.min(alvo.ordem, ordem);
    alvo.itens.push(p);
    porColuna.set(chave, alvo);
  }

  const colunas = [...porColuna.entries()].sort(
    (a, b) => a[1].ordem - b[1].ordem,
  );

  if (projetos.length === 0) {
    return (
      <div className="mt-8">
        <FolhaBranca folha="03/05">
          Nenhum projeto ainda. Eles nascem quando uma oportunidade vai para{" "}
          <Link href="/comercial" className="text-tinta underline underline-offset-2">
            Ganho
          </Link>{" "}
          no comercial.
        </FolhaBranca>
      </div>
    );
  }

  return (
    <Rolagem className="-mr-5 mt-8 flex items-stretch gap-2.5 overflow-x-auto pb-4 pr-5 sm:-mr-9 sm:pr-9">
      {colunas.map(([nome, { itens }]) => {
        const entregue = nome === ENTREGUE;
        const tom: Tom = entregue ? "pronto" : "nulo";
        const soma = itens.reduce((s, p) => s + Number(p.valor_contrato), 0);

        return (
          <div
            key={nome}
            className="flex w-[236px] shrink-0 flex-col overflow-hidden rounded-mod border border-traco bg-rail"
          >
            <div
              className="px-3 py-2.5"
              style={{
                background: `var(--color-st-${tom})`,
                color: `var(--color-st-${tom}-tx)`,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[13px] font-medium uppercase leading-tight tracking-[0.1em]">
                  {nome}
                </span>
                <span className="dado text-[13px] font-semibold">
                  {String(itens.length).padStart(2, "0")}
                </span>
              </div>
              <p className="dado mt-1.5 text-[11px] opacity-80">{brl(soma)}</p>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {itens.map((p) => (
                <CardProjeto key={p.id} projeto={p} />
              ))}
            </div>
          </div>
        );
      })}
    </Rolagem>
  );
}

function CardProjeto({ projeto }: { projeto: ProjetoQuadro }) {
  const atual = etapaAtual(projeto);
  const feitas = projeto.etapas.filter(concluida).length;
  const recebido = projeto.parcelas
    .filter((x) => x.status === "paga")
    .reduce((s, x) => s + Number(x.valor), 0);
  const atrasada = atual?.prazo ? diasAte(atual.prazo) < 0 : false;

  return (
    <Link
      href={`/projetos/${projeto.id}`}
      data-nao-puxar
      className="block overflow-hidden rounded-mod border border-traco bg-painel transition-shadow hover:shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]"
    >
      <div className="px-3 pb-3 pt-2.5">
        <p className="nome truncate text-[13px] leading-snug text-tinta">
          {projeto.nome}
        </p>
        <p className="mt-1 truncate text-[12px] text-tinta-media">
          {projeto.clientes?.nome ?? "â€”"} Â·{" "}
          {ROTULO_TIPO[projeto.tipo_projeto] ?? projeto.tipo_projeto}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Selo
            tom={atual ? (TOM_ETAPA[atual.status] ?? "nulo") : "pronto"}
            hachura={atual ? etapaHachurada(atual.status) : false}
          >
            {feitas}/{projeto.etapas.length}
          </Selo>
          {atual?.prazo ? (
            <Selo tom={atrasada ? "alerta" : "nulo"}>
              {dataCurta(atual.prazo)}
            </Selo>
          ) : null}
        </div>

      </div>

      {/* pÃ© de carimbo */}
      <div className="grid grid-cols-2 border-t border-tinta">
        <div className="border-r border-tinta px-3 py-1.5">
          <p className="carimbo-rot">Contrato</p>
          <Valor reais={projeto.valor_contrato} tamanho={17} />
        </div>
        <div className="px-3 py-1.5">
          <p className="carimbo-rot">Recebido</p>
          <Valor reais={recebido} tamanho={17} tom="fraca" />
        </div>
      </div>
    </Link>
  );
}
