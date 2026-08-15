"use client";

import { useState } from "react";
import { Modal, Campo, BotaoConfirmar } from "@/components/modal";
import { brl, hojeISO, ROTULO_TIPO } from "@/lib/format";
import type { CardOportunidade } from "./quadro";
import type { Resultado } from "@/actions/comercial";

const TIPOS = ["residencial", "corporativo", "retrofit", "interiores", "outro"];

/* R1 — daqui sai um projeto inteiro: etapas do template com prazos acumulados
   e uma parcela por etapa, tudo numa transação só. */
export function ModalGanho({
  card,
  onFechar,
  onConfirmar,
}: {
  card: CardOportunidade;
  onFechar: () => void;
  onConfirmar: (dados: {
    nome: string;
    tipoProjeto: string;
    valorContrato: number;
    dataInicio: string;
  }) => Promise<Resultado>;
}) {
  const [nome, setNome] = useState(
    `${card.clientes?.nome ?? "Projeto"} — ${card.titulo}`,
  );
  const [tipo, setTipo] = useState(card.tipo_projeto);
  const [valor, setValor] = useState(String(card.valor_proposta ?? ""));
  const [inicio, setInicio] = useState(hojeISO());
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const numero = Number(valor.replace(/\./g, "").replace(",", "."));

  return (
    <Modal eyebrow="Contrato assinado" titulo="Abrir projeto" onFechar={onFechar}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setOcupado(true);
          const r = await onConfirmar({
            nome,
            tipoProjeto: tipo,
            valorContrato: numero,
            dataInicio: inicio,
          });
          setOcupado(false);
          if (!r.ok) setErro(r.erro ?? "Não deu para converter.");
        }}
      >
        <Campo rotulo="Nome do projeto">
          <input
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </Campo>

        <Campo rotulo="Tipo — define o template de etapas">
          <select
            className="campo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO[t]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Valor do contrato">
          <input
            className="campo"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="120000"
            required
          />
        </Campo>
        {numero > 0 ? (
          <p className="dado mt-1.5 text-[11px] text-tinta-fraca">
            {brl(numero, true)} · dividido nas parcelas do template
          </p>
        ) : null}

        <Campo rotulo="Início — os prazos contam a partir daqui">
          <input
            className="campo"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />
        </Campo>

        {erro ? (
          <p className="mt-4 border-l-2 border-ferrugem bg-ferrugem-fundo px-3 py-2 text-[12px] text-ferrugem">
            {erro}
          </p>
        ) : null}

        <BotaoConfirmar ocupado={ocupado}>Criar projeto</BotaoConfirmar>
      </form>
    </Modal>
  );
}
