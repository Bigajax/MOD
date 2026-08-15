"use client";

import { useState, useTransition } from "react";
import { salvarLinkDrive } from "@/actions/producao";

/* Sem upload na v1: o link do Drive resolve e não custa storage nenhum. */
export function CampoDrive({
  projetoId,
  valorInicial,
}: {
  projetoId: string;
  valorInicial: string | null;
}) {
  const [link, setLink] = useState(valorInicial ?? "");
  const [editando, setEditando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [ocupado, iniciar] = useTransition();

  if (!editando) {
    return (
      <div className="flex items-center gap-3">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="dado truncate text-[11px] text-argila underline underline-offset-2"
          >
            Arquivos no Drive ↗
          </a>
        ) : (
          <span className="dado text-[11px] text-tinta-fraca">
            Sem link do Drive
          </span>
        )}
        <button
          onClick={() => {
            setEditando(true);
            setSalvo(false);
          }}
          className="dado text-[10px] uppercase tracking-[0.14em] text-tinta-fraca transition-colors hover:text-tinta"
        >
          {link ? "trocar" : "adicionar"}
        </button>
        {salvo ? (
          <span className="dado text-[10px] text-verde">salvo</span>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          await salvarLinkDrive(projetoId, link);
          setEditando(false);
          setSalvo(true);
        });
      }}
    >
      <input
        className="campo max-w-[340px] py-1.5 text-[13px]"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://drive.google.com/…"
        autoFocus
      />
      <button
        type="submit"
        disabled={ocupado}
        className="dado shrink-0 rounded-mod border border-traco-forte px-2.5 text-[10px] uppercase tracking-[0.14em] text-tinta-media transition-colors hover:text-tinta disabled:opacity-40"
      >
        Salvar
      </button>
    </form>
  );
}
