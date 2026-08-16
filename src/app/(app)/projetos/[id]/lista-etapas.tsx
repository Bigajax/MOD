"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  mudarStatusEtapa,
  alternarTarefa,
  criarTarefa,
  removerTarefa,
} from "@/actions/producao";
import { mudarStatusParcela } from "@/actions/financeiro";
import { Mira, Selo } from "@/components/bloco";
import { dataCurta, diasAte, ROTULO_ETAPA, comoData } from "@/lib/format";
import { chip, TOM_ETAPA, etapaHachurada } from "@/lib/status";

type Tarefa = {
  id: string;
  titulo: string;
  concluida: boolean;
  prazo: string | null;
};

type Etapa = {
  id: string;
  nome: string;
  ordem: number;
  prazo: string | null;
  status: string;
  data_entrega: string | null;
  data_aprovacao: string | null;
  tarefas: Tarefa[];
};

const STATUS = [
  "nao_iniciada",
  "em_andamento",
  "aguardando_aprovacao",
  "aprovada",
  "concluida",
];

function espera(etapa: Etapa) {
  if (!etapa.data_entrega || !etapa.data_aprovacao) return null;
  const e = comoData(etapa.data_entrega)!;
  const a = comoData(etapa.data_aprovacao)!;
  return Math.max(0, Math.round((a.getTime() - e.getTime()) / 86_400_000));
}

export function ListaEtapas({
  projetoId,
  etapas,
}: {
  projetoId: string;
  etapas: Etapa[];
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState<string | null>(null);
  const [convite, setConvite] = useState<{
    parcelaId: string;
    texto: string;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  return (
    <div>
      {convite ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-mod border border-verde/50 bg-verde-fundo px-4 py-3">
          <span className="text-[13px] text-verde">{convite.texto}</span>
          <button
            onClick={() =>
              iniciar(async () => {
                await mudarStatusParcela(
                  convite.parcelaId,
                  "faturada",
                  projetoId,
                );
                setConvite(null);
                router.refresh();
              })
            }
            className="dado rounded-mod border border-verde px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-verde transition-colors hover:bg-verde hover:text-viewport"
          >
            Faturar
          </button>
          <button
            onClick={() => setConvite(null)}
            className="dado text-[10px] uppercase tracking-[0.14em] text-tinta-fraca hover:text-tinta"
          >
            Agora não
          </button>
        </div>
      ) : null}

      {erro ? (
        <p className="mt-4 text-[12px] text-ferrugem">{erro}</p>
      ) : null}

      <ul className="mt-1">
        {etapas.map((etapa) => {
          const expandida = aberta === etapa.id;
          const concluida =
            etapa.status === "aprovada" || etapa.status === "concluida";
          const atrasada = !concluida && etapa.prazo && diasAte(etapa.prazo) < 0;
          const d = espera(etapa);
          const feitas = etapa.tarefas.filter((t) => t.concluida).length;

          return (
            <li key={etapa.id} className="border-b border-traco">
              <div className="flex items-center gap-3 py-3">
                <button
                  onClick={() => setAberta(expandida ? null : etapa.id)}
                  aria-expanded={expandida}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`shrink-0 ${concluida ? "text-tinta" : "text-tinta-fraca"}`}
                  >
                    <Mira />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`nome block truncate text-[15px] ${
                        concluida ? "text-tinta-media" : "text-tinta"
                      }`}
                    >
                      {etapa.nome}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      {atrasada ? (
                        <Selo tom="alerta">{dataCurta(etapa.prazo)}</Selo>
                      ) : (
                        <span className="dado text-[12px] text-tinta-fraca">
                          {dataCurta(etapa.prazo)}
                        </span>
                      )}
                      {etapa.tarefas.length > 0 ? (
                        <span className="dado text-[12px] text-tinta-fraca">
                          {feitas}/{etapa.tarefas.length} tarefas
                        </span>
                      ) : null}
                      {d !== null ? (
                        <Selo tom={d > 10 ? "alerta" : "nulo"}>
                          cliente levou {d}d
                        </Selo>
                      ) : null}
                    </span>
                  </span>
                </button>

                <select
                  aria-label={`Status de ${etapa.nome}`}
                  className={`chip w-[180px] shrink-0 ${
                    etapaHachurada(etapa.status) ? "chip-hachura" : ""
                  }`}
                  style={chip(TOM_ETAPA[etapa.status] ?? "nulo")}
                  value={etapa.status}
                  onChange={(e) => {
                    const novo = e.target.value;
                    setErro(null);
                    iniciar(async () => {
                      const r = await mudarStatusEtapa(etapa.id, novo);
                      if (!r.ok) {
                        setErro(r.erro ?? "Não deu para mudar o status.");
                        return;
                      }
                      // R2 — a entrega libera a medição da parcela.
                      if (r.parcelaId) {
                        setConvite({
                          parcelaId: r.parcelaId,
                          texto: `Entrega registrada. Faturar a parcela "${r.parcelaDescricao}"?`,
                        });
                      }
                      router.refresh();
                    });
                  }}
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_ETAPA[s]}
                    </option>
                  ))}
                </select>
              </div>

              {expandida ? (
                <Tarefas
                  etapa={etapa}
                  projetoId={projetoId}
                  onMudou={() => router.refresh()}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Tarefas({
  etapa,
  projetoId,
  onMudou,
}: {
  etapa: Etapa;
  projetoId: string;
  onMudou: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [, iniciar] = useTransition();

  return (
    <div className="mb-4 ml-6 border-l border-traco pl-5">
      <ul className="space-y-1">
        {etapa.tarefas.map((t) => (
          <li key={t.id} className="group flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={t.concluida}
              onChange={(e) =>
                iniciar(async () => {
                  await alternarTarefa(t.id, e.target.checked, projetoId);
                  onMudou();
                })
              }
              className="h-3.5 w-3.5 shrink-0 accent-argila"
            />
            <span
              className={`flex-1 text-[13px] ${
                t.concluida ? "text-tinta-fraca line-through" : "text-tinta-media"
              }`}
            >
              {t.titulo}
            </span>
            <button
              onClick={() =>
                iniciar(async () => {
                  await removerTarefa(t.id, projetoId);
                  onMudou();
                })
              }
              aria-label={`Remover ${t.titulo}`}
              className="dado text-[13px] leading-none text-tinta-fraca opacity-0 transition-opacity hover:text-ferrugem group-hover:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          const t = texto;
          setTexto("");
          iniciar(async () => {
            await criarTarefa(etapa.id, t, projetoId);
            onMudou();
          });
        }}
      >
        <input
          className="campo max-w-[320px] py-1.5 text-[13px]"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="+ tarefa"
        />
      </form>
    </div>
  );
}
