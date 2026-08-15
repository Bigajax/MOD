"use client";

import { useState } from "react";
import { Modal, Campo, BotaoConfirmar } from "@/components/modal";
import type { CardOportunidade } from "./quadro";
import type { Resultado } from "@/actions/comercial";

const MOTIVOS = [
  "Preço acima do orçamento do cliente",
  "Escolheu outro escritório",
  "Adiou a obra",
  "Sumiu / parou de responder",
  "Fora do nosso escopo",
];

/* R6 — perder sem motivo não vira aprendizado, então o modal trava. */
export function ModalPerda({
  card,
  onFechar,
  onConfirmar,
}: {
  card: CardOportunidade;
  onFechar: () => void;
  onConfirmar: (motivo: string) => Promise<Resultado>;
}) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <Modal
      eyebrow={card.clientes?.nome ?? "Oportunidade"}
      titulo="Por que perdemos?"
      onFechar={onFechar}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setOcupado(true);
          const r = await onConfirmar(motivo);
          setOcupado(false);
          if (!r.ok) setErro(r.erro ?? "Não deu para registrar.");
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {MOTIVOS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className={`dado rounded-mod border px-2 py-1 text-[10px] transition-colors ${
                motivo === m
                  ? "border-ferrugem bg-ferrugem-fundo text-ferrugem"
                  : "border-traco text-tinta-fraca hover:text-tinta"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <Campo rotulo="Motivo">
          <textarea
            className="campo min-h-[84px] resize-y"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="O que aconteceu, em uma frase"
            required
          />
        </Campo>

        {erro ? (
          <p className="mt-4 border-l-2 border-ferrugem bg-ferrugem-fundo px-3 py-2 text-[12px] text-ferrugem">
            {erro}
          </p>
        ) : null}

        <BotaoConfirmar ocupado={ocupado} tom="ferrugem">
          Registrar perda
        </BotaoConfirmar>
      </form>
    </Modal>
  );
}
