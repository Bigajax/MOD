"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatusParcela } from "@/actions/financeiro";
import { Selo } from "@/components/bloco";
import {
  brl,
  dataCurta,
  parcelaAtrasada,
  prazoRelativo,
  ROTULO_PARCELA,
} from "@/lib/format";
import { TOM_PARCELA } from "@/lib/status";

type Parcela = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string | null;
  status: string;
  data_pagamento: string | null;
  etapa_id: string | null;
};

const PROXIMO: Record<string, { alvo: string; rotulo: string } | undefined> = {
  prevista: { alvo: "faturada", rotulo: "Faturar" },
  faturada: { alvo: "paga", rotulo: "Marcar paga" },
};

export function PainelFinanceiro({
  projetoId,
  parcelas,
  nomePorEtapa,
}: {
  projetoId: string;
  parcelas: Parcela[];
  nomePorEtapa: Record<string, string>;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();

  return (
    <ul className="mt-7 space-y-0">
      {parcelas.map((p) => {
        // R5 — atraso é lido do vencimento, nunca gravado no banco.
        const atrasada = parcelaAtrasada(p);
        const proximo = PROXIMO[p.status];
        const tom = TOM_PARCELA[p.status] ?? "nulo";

        return (
          <li key={p.id} className="border-b border-traco py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-[13px] text-tinta">
                {p.descricao}
              </span>
              <span className="dado shrink-0 text-[13px] text-tinta">
                {brl(p.valor)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Selo tom={tom}>
                {p.status === "paga"
                  ? `paga ${dataCurta(p.data_pagamento)}`
                  : ROTULO_PARCELA[p.status]}
              </Selo>
              {atrasada ? (
                <Selo tom="alerta">{prazoRelativo(p.vencimento)}</Selo>
              ) : p.status !== "paga" ? (
                <span className="dado text-[11px] text-tinta-fraca">
                  vence {dataCurta(p.vencimento)}
                </span>
              ) : null}
              {p.etapa_id && nomePorEtapa[p.etapa_id] ? (
                <span className="dado truncate text-[10px] text-tinta-fraca">
                  · {nomePorEtapa[p.etapa_id]}
                </span>
              ) : null}
            </div>

            {proximo ? (
              <button
                onClick={() =>
                  iniciar(async () => {
                    await mudarStatusParcela(p.id, proximo.alvo, projetoId);
                    router.refresh();
                  })
                }
                className="dado mt-2 rounded-mod border border-traco-forte px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-tinta-media transition-colors hover:border-verde hover:text-verde"
              >
                {proximo.rotulo}
              </button>
            ) : null}
          </li>
        );
      })}

      {parcelas.length === 0 ? (
        <li className="py-5 text-[13px] text-tinta-fraca">
          Sem parcelas. Elas nascem junto com o projeto, a partir do template.
        </li>
      ) : null}
    </ul>
  );
}
