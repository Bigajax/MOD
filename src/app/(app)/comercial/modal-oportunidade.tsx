"use client";

import { useState, useTransition } from "react";
import { Modal, Campo, BotaoConfirmar } from "@/components/modal";
import { Selo } from "@/components/bloco";
import { Valor } from "@/components/valor";
import {
  registrarContato,
  atualizarOportunidade,
  atualizarContatoCliente,
} from "@/actions/comercial";
import {
  dataLonga,
  diasDesde,
  ROTULO_COMERCIAL,
  ROTULO_TIPO,
} from "@/lib/format";
import { TOM_COMERCIAL, tomParado } from "@/lib/status";
import type { CardOportunidade } from "./quadro";

const TIPOS = ["residencial", "corporativo", "retrofit", "interiores", "outro"];

const ROTULO_ORIGEM: Record<string, string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  acim: "ACIM",
  casacor: "CASACOR",
  site: "Site",
  outro: "Outro",
};

/* A ficha da oportunidade: o que se lê antes de ligar para o cliente, e as
   três coisas que se faz depois — registrar o contato, fechar ou perder. */
export function ModalOportunidade({
  card,
  onFechar,
  onMudou,
  onGanho,
  onPerda,
}: {
  card: CardOportunidade;
  onFechar: () => void;
  onMudou: () => void;
  onGanho: () => void;
  onPerda: () => void;
}) {
  const [titulo, setTitulo] = useState(card.titulo);
  const [tipo, setTipo] = useState(card.tipo_projeto);
  const [area, setArea] = useState(card.area_m2 ? String(card.area_m2) : "");
  const [valor, setValor] = useState(
    card.valor_proposta ? String(card.valor_proposta) : "",
  );
  const [followup, setFollowup] = useState(card.proximo_followup ?? "");
  const [telefone, setTelefone] = useState(card.clientes?.telefone ?? "");
  const [email, setEmail] = useState(card.clientes?.email ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const parado = diasDesde(card.ultimo_contato);
  const numero = (t: string) =>
    t.trim() ? Number(t.replace(/\./g, "").replace(",", ".")) : null;

  return (
    <Modal
      eyebrow={card.clientes?.nome ?? "Sem cliente"}
      titulo={card.titulo}
      onFechar={onFechar}
    >
      {/* Situação atual, antes de qualquer campo editável. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-traco pb-5">
        <Selo tom={TOM_COMERCIAL[card.etapa] ?? "nulo"}>
          {ROTULO_COMERCIAL[card.etapa] ?? card.etapa}
        </Selo>
        <Selo tom={tomParado(parado)}>{parado}d sem contato</Selo>
        {card.clientes?.origem ? (
          <Selo tom="nulo">
            {ROTULO_ORIGEM[card.clientes.origem] ?? card.clientes.origem}
          </Selo>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-4 border-b border-traco py-4">
        <div>
          <p className="carimbo-rot">Proposta</p>
          <div className="mt-1">
            <Valor reais={card.valor_proposta} tamanho={30} />
          </div>
        </div>
        <div className="text-right">
          <p className="carimbo-rot">Último contato</p>
          <p className="dado mt-1.5 text-[13px] text-tinta-media">
            {dataLonga(card.ultimo_contato)}
          </p>
        </div>
      </div>

      <button
        onClick={() =>
          iniciar(async () => {
            const r = await registrarContato(card.id);
            if (r.ok) onMudou();
            else setErro(r.erro ?? "Não deu para registrar.");
          })
        }
        disabled={ocupado || parado === 0}
        className="acao acao-cheia mt-5 w-full disabled:opacity-40"
      >
        {parado === 0 ? "Contato registrado hoje" : "Falei com o cliente hoje"}
      </button>

      <form
        className="mt-6 border-t border-traco pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          iniciar(async () => {
            const a = await atualizarOportunidade(card.id, {
              titulo,
              tipoProjeto: tipo,
              areaM2: numero(area),
              valorProposta: numero(valor),
              proximoFollowup: followup || null,
            });
            if (!a.ok) {
              setErro(a.erro ?? "Não deu para salvar.");
              return;
            }
            if (card.cliente_id) {
              await atualizarContatoCliente(card.cliente_id, {
                telefone,
                email,
              });
            }
            onMudou();
          });
        }}
      >
        <Campo rotulo="Oportunidade">
          <input
            className="campo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Tipo">
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
          <Campo rotulo="Área m²">
            <input
              className="campo"
              inputMode="decimal"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="240"
            />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Valor da proposta">
            <input
              className="campo"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="96000"
            />
          </Campo>
          <Campo rotulo="Próximo follow-up">
            <input
              className="campo"
              type="date"
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Telefone">
            <input
              className="campo"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(44) 99999-0000"
            />
          </Campo>
          <Campo rotulo="E-mail">
            <input
              className="campo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </Campo>
        </div>

        {erro ? (
          <p className="mt-4 border-l-2 border-ferrugem bg-ferrugem-fundo px-3 py-2 text-[12px] text-ferrugem">
            {erro}
          </p>
        ) : null}

        <BotaoConfirmar ocupado={ocupado}>Salvar</BotaoConfirmar>
      </form>

      {/* As duas saídas do funil. */}
      <div className="mt-6 flex gap-2 border-t border-traco pt-5">
        <button onClick={onGanho} className="acao flex-1">
          Fechou contrato
        </button>
        <button onClick={onPerda} className="acao flex-1">
          Perdemos
        </button>
      </div>
    </Modal>
  );
}
