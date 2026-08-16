"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* As seções são folhas do mesmo conjunto, e trocar de folha é trocar de aba —
   igual às abas de layout do CAD. A cor de cada aba é a da capa de destaque
   correspondente no Instagram da MOD. */
const FOLHAS = [
  { href: "/hoje", rotulo: "Hoje", secao: "hoje", num: "01/04" },
  { href: "/comercial", rotulo: "Comercial", secao: "comercial", num: "02/04" },
  { href: "/projetos", rotulo: "Projetos", secao: "projetos", num: "03/04" },
  { href: "/clientes", rotulo: "Clientes", secao: "clientes", num: "04/04" },
];

export function secaoDaRota(pathname: string) {
  const f = FOLHAS.find(
    (r) => pathname === r.href || pathname.startsWith(`${r.href}/`),
  );
  return f?.secao ?? "hoje";
}

export function AbasFolha() {
  const pathname = usePathname();
  const ativa = secaoDaRota(pathname);

  return (
    <nav
      aria-label="Folhas"
      className="sem-barra fixed inset-x-0 bottom-0 flex items-stretch gap-1 overflow-x-auto px-[calc(var(--folha-borda)+18px)]"
      style={{ height: "var(--folha-abas)" }}
    >
      {FOLHAS.map((folha) => {
        const sel = folha.secao === ativa;
        return (
          <Link
            key={folha.href}
            href={folha.href}
            aria-current={sel ? "page" : undefined}
            data-secao={folha.secao}
            className="aba"
          >
            <span className="aba-int">
              <span className="aba-num">{folha.num}</span>
              <span className="aba-nome">{folha.rotulo}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CascaSecao({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div data-secao={secaoDaRota(pathname)} className="contents">
      {children}
    </div>
  );
}
