import Link from "next/link";
import { chip, type Tom } from "@/lib/status";
import { FolhaBranca } from "@/components/valor";

/** A mira do cursor de CAD, usada como marcador de linha. */
export function Mira() {
  return (
    <svg
      className="mira"
      width="9"
      height="9"
      viewBox="0 0 9 9"
      aria-hidden
      fill="none"
    >
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function Bloco({
  titulo,
  contagem,
  nota,
  vazio,
  cor = "tinta",
  children,
}: {
  titulo: string;
  contagem: number;
  nota?: React.ReactNode;
  vazio: string;
  /** cor de marca do grupo: "azul" (Céu), "argila" (Terra), "verde" (Natureza) */
  cor?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-10">
      <div className="flex items-baseline justify-between gap-4 border-b border-traco pb-2">
        {/* O título é o rótulo dos cartões de cor do manual: caixa-alta
            espaçada, na própria cor da família. */}
        <h2
          className="font-display text-[19px] uppercase leading-none tracking-[0.2em]"
          style={{ color: `var(--color-${cor})` }}
        >
          {titulo}
        </h2>
        <span className="flex items-center gap-3">
          {nota ? (
            <span className="chip" style={chip("alerta")}>
              {nota}
            </span>
          ) : null}
          <span className="dado text-[15px] text-tinta-fraca">{contagem}</span>
        </span>
      </div>
      {contagem === 0 ? (
        <div className="pt-5">
          <FolhaBranca>{vazio}</FolhaBranca>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </section>
  );
}

export function LinhaRegistro({
  href,
  principal,
  secundario,
  direita,
  marca,
}: {
  href: string;
  principal: React.ReactNode;
  secundario?: React.ReactNode;
  direita?: React.ReactNode;
  marca?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="linha flex items-center gap-3.5 px-1 py-3 sm:gap-5"
    >
      <span className="shrink-0">{marca ?? <Mira />}</span>
      <span className="min-w-0 flex-1">
        <span className="nome block truncate text-[15px] text-tinta">
          {principal}
        </span>
        {secundario ? (
          <span className="dado mt-1 block truncate text-[12px] text-tinta-fraca">
            {secundario}
          </span>
        ) : null}
      </span>
      {direita ? <span className="shrink-0 text-right">{direita}</span> : null}
    </Link>
  );
}

/** Pastilha de status: peso de tinta, lida de longe. */
export function Selo({
  tom,
  hachura,
  children,
}: {
  tom: Tom;
  /** parado esperando alguém */
  hachura?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`chip ${hachura ? "chip-hachura" : ""}`} style={chip(tom)}>
      {children}
    </span>
  );
}

/* Faixa de título da folha: tudo numa linha só, para o desenho começar mais
   alto. Número da folha em bloco de tinta, título, e a linha-guia pontilhada
   atravessando o vazio até as ações — como a chamada de uma prancha. */
export function TituloPagina({
  eyebrow,
  titulo,
  folha,
  acoes,
}: {
  eyebrow: string;
  titulo: string;
  /** número desta folha no conjunto, ex.: "02" */
  folha: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-tinta pb-3">
      <span className="folha-num" aria-hidden>
        <b>{folha}</b>
        <span>folha</span>
      </span>

      <span className="min-w-0">
        <span className="titulo block truncate">{titulo}</span>
      </span>

      <span className="rotulo shrink-0 self-end pb-1">{eyebrow}</span>

      <span className="guia" aria-hidden />

      {acoes ? (
        <span className="flex shrink-0 items-center gap-2">{acoes}</span>
      ) : null}
    </div>
  );
}
