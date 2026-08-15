"use client";

import { useEffect, useRef } from "react";

/* =====================================================================
   Rolagem lateral por arrasto.

   A barra de rolagem some e a folha passa a ser puxada com o ponteiro, como
   se você empurrasse a prancha na mesa. Elementos marcados com
   `data-nao-puxar` (cards do kanban, botões, campos) ficam de fora, senão o
   arrasto do quadro brigaria com o arrasto do card.
   ===================================================================== */
export function Rolagem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let puxando = false;
    let xInicial = 0;
    let scrollInicial = 0;

    function aoDescer(e: PointerEvent) {
      if (e.button !== 0 || !el) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("[data-nao-puxar]")) return;

      puxando = true;
      xInicial = e.clientX;
      scrollInicial = el.scrollLeft;
      el.classList.add("puxando");
    }

    function aoMover(e: PointerEvent) {
      if (!puxando || !el) return;
      el.scrollLeft = scrollInicial - (e.clientX - xInicial);
    }

    function aoSoltar() {
      if (!el) return;
      puxando = false;
      el.classList.remove("puxando");
    }

    el.addEventListener("pointerdown", aoDescer);
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);

    return () => {
      el.removeEventListener("pointerdown", aoDescer);
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
    };
  }, []);

  return (
    <div ref={ref} className={`sem-barra arrastavel ${className}`}>
      {children}
    </div>
  );
}
