"use client";

import { useEffect, useRef } from "react";

export function Modal({
  titulo,
  eyebrow,
  onFechar,
  children,
}: {
  titulo: string;
  eyebrow: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caixa.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex items-center justify-center bg-viewport/85 px-5 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={caixa}
        className="sem-barra max-h-full w-full max-w-[420px] overflow-y-auto rounded-mod border border-traco-forte bg-painel p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="rotulo">{eyebrow}</p>
            <h2 className="mt-1.5 font-display text-[21px] font-light text-tinta">
              {titulo}
            </h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="dado text-[16px] leading-none text-tinta-fraca transition-colors hover:text-tinta"
          >
            ×
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="rotulo">{rotulo}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function BotaoConfirmar({
  children,
  ocupado,
  tom = "tinta",
}: {
  children: React.ReactNode;
  ocupado?: boolean;
  tom?: "tinta" | "ferrugem";
}) {
  const estilos =
    tom === "ferrugem"
      ? "border-ferrugem bg-ferrugem text-viewport"
      : "border-tinta bg-tinta text-viewport";

  return (
    <button
      type="submit"
      disabled={ocupado}
      className={`dado mt-7 w-full rounded-mod border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-opacity hover:opacity-85 disabled:opacity-40 ${estilos}`}
    >
      {ocupado ? "Gravando…" : children}
    </button>
  );
}
