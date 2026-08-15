"use client";

import { useState } from "react";
import { Modal, Campo, BotaoConfirmar } from "@/components/modal";
import { criarOportunidade } from "@/actions/comercial";
import { ROTULO_TIPO } from "@/lib/format";

const TIPOS = ["residencial", "corporativo", "retrofit", "interiores", "outro"];
const ORIGENS = [
  { v: "indicacao", r: "Indicação" },
  { v: "instagram", r: "Instagram" },
  { v: "acim", r: "ACIM" },
  { v: "casacor", r: "CASACOR" },
  { v: "site", r: "Site" },
  { v: "outro", r: "Outro" },
];

export function ModalNova({
  clientes,
  onFechar,
  onCriado,
}: {
  clientes: { id: string; nome: string }[];
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [clienteId, setClienteId] = useState("");
  const [clienteNovo, setClienteNovo] = useState("");
  const [origem, setOrigem] = useState("indicacao");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("residencial");
  const [valor, setValor] = useState("");
  const [followup, setFollowup] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const novoCliente = clienteId === "";

  return (
    <Modal eyebrow="Funil" titulo="Nova oportunidade" onFechar={onFechar}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setOcupado(true);
          const r = await criarOportunidade({
            clienteId: clienteId || null,
            clienteNovo,
            origem,
            titulo,
            tipoProjeto: tipo,
            valorProposta: valor
              ? Number(valor.replace(/\./g, "").replace(",", "."))
              : null,
            proximoFollowup: followup || null,
          });
          setOcupado(false);
          if (r.ok) onCriado();
          else setErro(r.erro ?? "Não deu para criar.");
        }}
      >
        <Campo rotulo="Cliente">
          <select
            className="campo"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">— criar novo —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>

        {novoCliente ? (
          <>
            <Campo rotulo="Nome do cliente novo">
              <input
                className="campo"
                value={clienteNovo}
                onChange={(e) => setClienteNovo(e.target.value)}
                placeholder="Ana e Rodrigo Alvorenga"
                required
              />
            </Campo>
            <Campo rotulo="Como chegou até vocês">
              <select
                className="campo"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
              >
                {ORIGENS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.r}
                  </option>
                ))}
              </select>
            </Campo>
          </>
        ) : null}

        <Campo rotulo="Oportunidade">
          <input
            className="campo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Casa térrea 220m² no Jardim Itália"
            required
          />
        </Campo>

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

        <Campo rotulo="Valor da proposta (opcional)">
          <input
            className="campo"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="85000"
          />
        </Campo>

        <Campo rotulo="Próximo follow-up (opcional)">
          <input
            className="campo"
            type="date"
            value={followup}
            onChange={(e) => setFollowup(e.target.value)}
          />
        </Campo>

        {erro ? (
          <p className="mt-4 border-l-2 border-ferrugem bg-ferrugem-fundo px-3 py-2 text-[12px] text-ferrugem">
            {erro}
          </p>
        ) : null}

        <BotaoConfirmar ocupado={ocupado}>Criar</BotaoConfirmar>
      </form>
    </Modal>
  );
}
