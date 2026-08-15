"use client";

import { useSyncExternalStore } from "react";

const CHAVE = "mod:tema";

/** Roda antes da pintura para a página não piscar no tema errado. */
export const scriptTema = `(function(){try{var t=localStorage.getItem("${CHAVE}");if(t==="escuro")document.documentElement.dataset.tema="escuro"}catch(e){}})()`;

/* O tema vive no <html>, não no React. useSyncExternalStore lê essa fonte
   externa em vez de espelhar num useState dentro de efeito. */
const ouvintes = new Set<() => void>();

function assinar(callback: () => void) {
  ouvintes.add(callback);
  return () => ouvintes.delete(callback);
}

function lerCliente() {
  return document.documentElement.dataset.tema === "escuro";
}

export function TrocaTema() {
  const escuro = useSyncExternalStore(assinar, lerCliente, () => false);

  function alternar() {
    const novo = !escuro;
    if (novo) document.documentElement.dataset.tema = "escuro";
    else delete document.documentElement.dataset.tema;
    try {
      localStorage.setItem(CHAVE, novo ? "escuro" : "prancha");
    } catch {
      // Modo anônimo: a preferência só não persiste.
    }
    ouvintes.forEach((n) => n());
  }

  return (
    <button
      onClick={alternar}
      aria-pressed={escuro}
      title="Alternar entre prancha e viewport"
      className="dado flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-tinta-fraca transition-colors hover:text-tinta"
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-[1px] border border-current"
        style={{ background: escuro ? "transparent" : "currentColor" }}
      />
      {escuro ? "viewport" : "prancha"}
    </button>
  );
}
