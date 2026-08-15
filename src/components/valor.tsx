/* O dinheiro como manchete: cifrão minúsculo em mono, número grande e
   tabular. O rótulo encolhe para nota de margem. */

const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function Valor({
  reais,
  tamanho = 26,
  tom = "tinta",
}: {
  reais: number | null | undefined;
  /** corpo do número em px */
  tamanho?: number;
  tom?: "tinta" | "fraca";
}) {
  return (
    <span
      className="valor"
      style={{
        fontSize: `${tamanho}px`,
        color: tom === "fraca" ? "var(--color-tinta-media)" : undefined,
      }}
    >
      <span className="valor-cifra">R$</span>
      {NUM.format(Number(reais ?? 0))}
    </span>
  );
}

export function FolhaBranca({
  children,
  folha,
}: {
  children: React.ReactNode;
  folha?: string;
}) {
  return (
    <div>
      <div className="folha-branca">{children}</div>
      <p className="folha-branca-nota">
        Folha em branco{folha ? ` · ${folha}` : ""}
      </p>
    </div>
  );
}
