import { Valor } from "@/components/valor";
import { Rolagem } from "@/components/rolagem";
import { brl, comoData, dataCurta, diasAte, ROTULO_PARCELA } from "@/lib/format";

/* =====================================================================
   A cadeia de cotas.

   O contrato é uma linha do tempo cotada: o vão entre duas etapas é uma
   cota com ticks nas pontas e os dias escritos em cima. Embaixo de cada
   etapa pende a parcela que ela libera, na mesma vertical.

   É o desenho da regra de ouro do escritório — entregou a etapa, libera a
   parcela — e mostra numa olhada o que travou e quanto deixou de ser
   faturado por causa disso.
   ===================================================================== */

type Etapa = {
  id: string;
  nome: string;
  ordem: number;
  prazo: string | null;
  status: string;
};

type Parcela = {
  id: string;
  valor: number;
  status: string;
  vencimento: string | null;
  etapa_id: string | null;
};

function diasEntre(a: string | null, b: string | null) {
  const d1 = comoData(a);
  const d2 = comoData(b);
  if (!d1 || !d2) return null;
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
}

export function CadeiaCotas({
  etapas,
  parcelas,
  dataInicio,
}: {
  etapas: Etapa[];
  parcelas: Parcela[];
  dataInicio: string;
}) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
  if (ordenadas.length === 0) return null;

  const porEtapa = new Map(
    parcelas.filter((p) => p.etapa_id).map((p) => [p.etapa_id!, p]),
  );

  return (
    <Rolagem className="-mr-5 overflow-x-auto pb-1 pr-5 sm:-mr-9 sm:pr-9">
      <div
        className="grid min-w-[640px]"
        style={{
          gridTemplateColumns: `repeat(${ordenadas.length}, minmax(112px, 1fr))`,
        }}
      >
        {/* cota de prazo: dias sobre a linha, tick em cada extremidade */}
        {ordenadas.map((etapa, i) => {
          const anterior = i === 0 ? dataInicio : ordenadas[i - 1].prazo;
          const vao = diasEntre(anterior, etapa.prazo);
          return (
            <div key={`cota-${etapa.id}`} className="px-1">
              <p className="dado mb-1 text-center text-[10px] text-tinta-fraca">
                {vao !== null ? `${vao}d` : "—"}
              </p>
              <div className="flex items-center">
                <span className="cota-tick" />
                <span className="cota-linha flex-1" />
                <span className="cota-tick" />
              </div>
            </div>
          );
        })}

        {/* a etapa */}
        {ordenadas.map((etapa) => {
          const concluida =
            etapa.status === "aprovada" || etapa.status === "concluida";
          const vencida =
            !concluida && etapa.prazo !== null && diasAte(etapa.prazo) < 0;
          const aguardando = etapa.status === "aguardando_aprovacao";

          return (
            <div key={`etapa-${etapa.id}`} className="px-1 pt-3">
              <div
                className={`h-2 rounded-[1px] ${aguardando ? "hachura" : ""}`}
                style={{
                  background: concluida
                    ? "var(--color-st-pronto)"
                    : vencida
                      ? "var(--color-st-alerta)"
                      : aguardando
                        ? "var(--color-st-avanco)"
                        : "var(--color-st-nulo)",
                }}
                aria-hidden
              />
              <p className="mt-2 text-[12px] font-medium leading-tight text-tinta">
                {etapa.nome}
              </p>
              <p
                className={`dado mt-1 text-[11px] ${
                  vencida ? "text-ferrugem" : "text-tinta-fraca"
                }`}
              >
                {dataCurta(etapa.prazo)}
              </p>
            </div>
          );
        })}

        {/* a medição pendurada na mesma vertical */}
        {ordenadas.map((etapa) => {
          const parcela = porEtapa.get(etapa.id);
          if (!parcela) {
            return <div key={`parc-${etapa.id}`} className="px-1" />;
          }
          const atrasada =
            parcela.vencimento !== null &&
            (parcela.status === "prevista" || parcela.status === "faturada") &&
            diasAte(parcela.vencimento) < 0;

          return (
            <div key={`parc-${etapa.id}`} className="flex flex-col px-1">
              <span className="cota-haste ml-2 h-4" aria-hidden />
              <div
                className={`rounded-[2px] border px-2 py-1.5 ${
                  atrasada ? "hachura border-ferrugem/60" : "border-traco"
                }`}
              >
                <Valor reais={parcela.valor} tamanho={16} />
                <p className="dado mt-1 text-[10px] uppercase tracking-[0.08em] text-tinta-fraca">
                  {atrasada ? "atrasada" : ROTULO_PARCELA[parcela.status]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="dado mt-4 text-[11px] text-tinta-fraca">
        Cota em cima é o vão de prazo entre etapas. Embaixo, a parcela que a
        etapa libera —{" "}
        {brl(
          parcelas
            .filter(
              (p) =>
                p.vencimento !== null &&
                (p.status === "prevista" || p.status === "faturada") &&
                diasAte(p.vencimento) < 0,
            )
            .reduce((s, p) => s + Number(p.valor), 0),
        )}{" "}
        travados por etapa vencida.
      </p>
    </Rolagem>
  );
}
