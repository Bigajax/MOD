import { brl } from "@/lib/format";

/* A cota de projeto. Numa prancha, valor medido se anota sobre uma linha de
   cota com ticks nas extremidades — e o sistema inteiro existe para medir
   etapa. Então o dinheiro do contrato aparece como cota, não como barra de
   progresso de SaaS. */
export function LinhaDimensao({
  recebido,
  total,
  rotuloEsq = "Recebido",
  rotuloDir = "Contrato",
}: {
  recebido: number;
  total: number;
  rotuloEsq?: string;
  rotuloDir?: string;
}) {
  const fracao = total > 0 ? Math.min(1, Math.max(0, recebido / total)) : 0;
  const pct = Math.round(fracao * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="rotulo">{rotuloEsq}</span>
        <span className="rotulo">{rotuloDir}</span>
      </div>

      <div className="mt-2 flex items-center">
        {/* tick de origem */}
        <span className="h-3 w-px shrink-0 bg-traco-forte" />
        <span className="relative h-px flex-1 bg-traco">
          <span
            className="absolute inset-y-0 left-0 bg-verde"
            style={{ width: `${fracao * 100}%` }}
          />
          {fracao > 0 && fracao < 1 ? (
            <span
              className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-verde"
              style={{ left: `${fracao * 100}%` }}
            />
          ) : null}
        </span>
        {/* tick de fim */}
        <span className="h-3 w-px shrink-0 bg-traco-forte" />
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="dado text-[13px] text-verde">
          {brl(recebido, true)}
        </span>
        <span className="dado text-[11px] text-tinta-fraca">{pct}%</span>
        <span className="dado text-[13px] text-tinta">{brl(total, true)}</span>
      </div>
    </div>
  );
}
