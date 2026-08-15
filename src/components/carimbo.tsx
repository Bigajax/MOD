/* =====================================================================
   Carimbo de prancha.

   Numa folha de projeto o carimbo é o quadro no canto que diz de quem é a
   obra, qual a escala, a data, o número da folha e a revisão. Aqui ele é o
   cabeçalho de toda tela: as células carregam o dado real de cada contexto,
   e a estrutura é a mesma que os dois sócios já leem todo dia numa prancha.
   ===================================================================== */

export type Celula = {
  rotulo: string;
  valor: React.ReactNode;
  /** quantas colunas a célula ocupa; as linhas precisam fechar o total */
  span?: number;
  /** valor em corpo maior, para o nome da obra */
  destaque?: boolean;
  /** hachura de corte: o prazo estourou */
  furado?: boolean;
};

export function Carimbo({
  celulas,
  colunas = 4,
  marca = false,
}: {
  celulas: Celula[];
  colunas?: number;
  /** abre a tira com o bloco de tinta da marca, como no carimbo impresso */
  marca?: boolean;
}) {
  return (
    <div
      className="carimbo overflow-hidden rounded-mod"
      style={{
        gridTemplateColumns: marca
          ? `auto repeat(${colunas}, minmax(0, 1fr))`
          : `repeat(${colunas}, minmax(0, 1fr))`,
      }}
    >
      {marca ? (
        <div className="carimbo-marca">
          <span className="carimbo-marca-nome">MOD</span>
          <span className="carimbo-marca-sub">Arquitetura</span>
        </div>
      ) : null}
      {celulas.map((c, i) => (
        <div
          key={`${c.rotulo}-${i}`}
          className={`carimbo-cel ${c.furado ? "hachura" : ""}`}
          style={c.span && c.span > 1 ? { gridColumn: `span ${c.span}` } : undefined}
        >
          <p className="carimbo-rot">{c.rotulo}</p>
          <p
            className={`carimbo-val ${c.destaque ? "carimbo-val-largo" : ""} ${
              c.furado ? "text-ferrugem" : ""
            }`}
          >
            {c.valor}
          </p>
        </div>
      ))}
    </div>
  );
}

/** A faixa de marcas da margem da prancha. */
export function MargemFolha() {
  return <div className="folha-marca" aria-hidden />;
}

/* O carimbo travado no canto inferior direito da folha. Numa prancha ele
   nunca sai do lugar: você rola o desenho, o carimbo fica. */
export function CarimboFolha({
  folha,
  celulas,
  colunas,
}: {
  folha: string;
  celulas: Celula[];
  colunas?: number;
}) {
  const hoje = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date());

  const linhas: Celula[] = [
    { rotulo: "Folha", valor: folha },
    { rotulo: "Data", valor: hoje },
    ...celulas,
  ];

  // Uma linha só: o carimbo é tira de margem, não bloco. Em tela estreita
  // ele quebra em duas colunas via CSS.
  return (
    <div className="carimbo-fixo">
      <Carimbo marca colunas={colunas ?? linhas.length} celulas={linhas} />
    </div>
  );
}
