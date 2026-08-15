"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Selo, Mira } from "@/components/bloco";
import { brl } from "@/lib/format";
import { chip } from "@/lib/status";

export type ClienteLinha = {
  id: string;
  nome: string;
  tipo_pessoa: string;
  telefone: string | null;
  email: string | null;
  origem: string;
  oportunidades: { id: string; etapa: string; valor_proposta: number | null }[];
  projetos: { id: string; nome: string; valor_contrato: number }[];
};

const ROTULO_ORIGEM: Record<string, string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  acim: "ACIM",
  casacor: "CASACOR",
  site: "Site",
  outro: "Outro",
};

export function TabelaClientes({ clientes }: { clientes: ClienteLinha[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nome.toLowerCase().includes(q));
  }, [busca, clientes]);

  return (
    <div>
      <input
        className="campo mt-7 max-w-[300px]"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="buscar por nome"
        aria-label="Buscar cliente"
      />

      <div className="mt-6">
        {filtrados.length === 0 ? (
          <p className="border-b border-traco py-6 text-[13px] text-tinta-fraca">
            {clientes.length === 0
              ? "Nenhum cliente ainda. Eles nascem junto com a primeira oportunidade."
              : "Nenhum nome bate com essa busca."}
          </p>
        ) : (
          filtrados.map((c) => {
            const emJogo = c.oportunidades.filter(
              (o) => o.etapa !== "ganho" && o.etapa !== "perdido",
            );
            const fechado = c.projetos.reduce(
              (s, p) => s + Number(p.valor_contrato),
              0,
            );

            return (
              <div
                key={c.id}
                className="linha flex items-center gap-4 px-1 py-3"
              >
                <span className="shrink-0 text-tinta-fraca">
                  <Mira />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-tinta">{c.nome}</p>
                  <p className="dado mt-0.5 truncate text-[11px] text-tinta-fraca">
                    {[
                      ROTULO_ORIGEM[c.origem] ?? c.origem,
                      c.telefone,
                      c.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {emJogo.length > 0 ? (
                    <Selo tom="inicio">{emJogo.length} no funil</Selo>
                  ) : null}
                  {c.projetos.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projetos/${p.id}`}
                      className="chip transition-opacity hover:opacity-85"
                      style={chip("pronto")}
                    >
                      {p.nome.length > 22 ? `${p.nome.slice(0, 22)}…` : p.nome}
                    </Link>
                  ))}
                  {fechado > 0 ? (
                    <span className="dado text-[12px] text-tinta-media">
                      {brl(fechado)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
