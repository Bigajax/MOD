"use client";

import { useState } from "react";
import type {
  ItemPrograma,
  Lote,
  OrientacaoNorte,
  TipoComodo,
  Variante,
} from "@/lib/solver/tipos.ts";
import { gerarEstudo } from "@/lib/solver/index.ts";
import { PARAMETROS, PESOS_PADROES } from "@/lib/estudo/config";
import { PlantaSVG } from "./planta-svg";
import { CroquiLote } from "./croqui-lote";
import { PRESETS_LOTE } from "./presets";

/* Defaults do programa: os mínimos são regra do validador; o alvo é o que
   o usuário ajusta. Quantidade 0 = fora do programa. */
const LINHAS_PROGRAMA: {
  tipo: TipoComodo;
  rotulo: string;
  min: number;
  alvo: number;
  qtd: number;
}[] = [
  { tipo: "sala", rotulo: "Sala", min: 12, alvo: 20, qtd: 1 },
  { tipo: "cozinha", rotulo: "Cozinha", min: 6, alvo: 10, qtd: 1 },
  { tipo: "quarto", rotulo: "Quarto", min: 9, alvo: 10, qtd: 2 },
  { tipo: "suite", rotulo: "Suíte", min: 12, alvo: 14, qtd: 1 },
  { tipo: "banho", rotulo: "Banho", min: 3, alvo: 4, qtd: 1 },
  { tipo: "lavabo", rotulo: "Lavabo", min: 2, alvo: 2.5, qtd: 0 },
  { tipo: "servico", rotulo: "Serviço", min: 3, alvo: 5, qtd: 1 },
  { tipo: "varanda", rotulo: "Varanda", min: 2, alvo: 8, qtd: 0 },
];

/* A folha vazia mostra uma planta-fantasma: o solver roda uma vez no
   navegador. A ficha AQUI é só do exemplo da marca d'água — o formulário
   real exige a Ficha Técnica preenchida pelo usuário (Art. 110). */
const LOTE_EXEMPLO: Lote = {
  largura: 12,
  profundidade: 30,
  ficha: {
    recuoFrontal: 3,
    taxaOcupacaoMax: 0.7,
    coeficienteAproveitamento: 1.4,
    permeabilidadeMinima: 0.1,
    dataEmissao: "2026-08-18",
  },
};
const FANTASMA = (() => {
  const r = gerarEstudo(
    LOTE_EXEMPLO,
    LINHAS_PROGRAMA.filter((l) => l.qtd > 0).map((l) => ({
      tipo: l.tipo,
      quantidade: l.qtd,
      areaMin: l.min,
      areaAlvo: l.alvo,
    })),
    1,
    PARAMETROS,
    PESOS_PADROES,
  );
  return "erro" in r ? null : r.variantes[0];
})();

/* A opção na tela é a variante do solver + o que só o banco sabe:
   id para favoritar e o estado da estrela. */
type Opcao = Variante & { id?: string | null; favorita?: boolean };

type Resposta =
  | { estado: "vazio" }
  | { estado: "desenhando" }
  | {
      estado: "pronto";
      variantes: Opcao[];
      norte?: OrientacaoNorte;
      calibrado?: boolean;
      loteUsado: { largura: number; profundidade: number };
    }
  | { estado: "erro"; mensagem: string };

const NORTES: { v: OrientacaoNorte | ""; r: string }[] = [
  { v: "", r: "— não sei —" },
  { v: "frente", r: "na frente (lado da rua)" },
  { v: "fundos", r: "nos fundos" },
  { v: "esquerda", r: "à esquerda" },
  { v: "direita", r: "à direita" },
];

function numero(v: string): number {
  return Number(v.replace(",", "."));
}

/* Congelado no carregamento da página: basta para conferir os 90 dias
   da Ficha (Art. 110) sem função impura no render. */
const AGORA = Date.now();

/* O pedido é preenchido como um carimbo de prancha: células densas com
   rótulo miúdo e valor, sem moldura própria por campo — o foco acende a
   célula inteira (CSS .carimbo-cel:focus-within). */
function Cel({
  rotulo,
  span,
  title,
  children,
}: {
  rotulo: string;
  span?: number;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className="carimbo-cel block"
      title={title}
      style={span ? { gridColumn: `span ${span}` } : undefined}
    >
      <span className="carimbo-rot">{rotulo}</span>
      <span className="flex items-baseline gap-1.5">{children}</span>
    </label>
  );
}

function CelMedida({
  rotulo,
  valor,
  aoMudar,
  sufixo = "m",
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  sufixo?: string;
  placeholder?: string;
}) {
  return (
    <Cel rotulo={rotulo}>
      <input
        className="campo-cel"
        inputMode="decimal"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
      />
      <span className="dado shrink-0 text-[10px] text-tinta-fraca">
        {sufixo}
      </span>
    </Cel>
  );
}

export function Gerador({
  clientes,
}: {
  clientes: { id: string; nome: string }[];
}) {
  const [largura, setLargura] = useState("12");
  const [profundidade, setProfundidade] = useState("30");
  const [norte, setNorte] = useState<OrientacaoNorte | "">("");
  const [presetId, setPresetId] = useState("");
  // Ficha Técnica (Art. 110): sem default — copiar do documento
  const [fichaRecuo, setFichaRecuo] = useState("");
  const [fichaTaxa, setFichaTaxa] = useState("");
  const [fichaCA, setFichaCA] = useState("");
  const [fichaPerm, setFichaPerm] = useState("");
  const [fichaData, setFichaData] = useState("");
  const [casaAcessivel, setCasaAcessivel] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [programa, setPrograma] = useState(LINHAS_PROGRAMA);
  const [resposta, setResposta] = useState<Resposta>({ estado: "vazio" });

  function aplicarPreset(id: string) {
    setPresetId(id);
    const p = PRESETS_LOTE.find((x) => x.id === id);
    if (!p) return;
    setLargura(String(p.largura).replace(".", ","));
    setProfundidade(String(p.profundidade).replace(".", ","));
  }

  function mudarLinha(i: number, campo: "qtd" | "alvo", v: string) {
    setPrograma((atual) =>
      atual.map((linha, j) =>
        j === i ? { ...linha, [campo]: v === "" ? 0 : numero(v) } : linha,
      ),
    );
  }

  const fichaCompleta =
    [fichaRecuo, fichaTaxa, fichaCA, fichaPerm].every(
      (v) => v !== "" && Number.isFinite(numero(v)),
    ) && fichaData !== "";
  const fichaVencida = (() => {
    if (!fichaData) return false;
    const emissao = new Date(`${fichaData}T00:00:00`);
    return AGORA - emissao.getTime() > 90 * 86_400_000;
  })();

  // soma viva do programa contra o teto do terreno — avisa antes do clique
  const alvoPrograma = programa.reduce((s, l) => s + l.qtd * l.alvo, 0);
  const areaDisponivel = (() => {
    const L = numero(largura);
    const P = numero(profundidade);
    const frontal = numero(fichaRecuo);
    const taxa = numero(fichaTaxa) / 100;
    if (![L, P, frontal, taxa].every((n) => Number.isFinite(n) && n > 0))
      return null;
    const frente = Math.max(frontal, PARAMETROS.vaga.comprimento);
    const disp = Math.min(
      L * (P - frente - PARAMETROS.implantacao.quintalMinimo),
      taxa * L * P,
    );
    return disp > 0 ? Math.round(disp) : null;
  })();
  const programaCabe =
    areaDisponivel === null || alvoPrograma * 1.1 <= areaDisponivel;

  /* Favoritar é o gesto que ensina o motor: otimista na tela, gravado
     no banco; se a gravação falhar, a estrela volta. */
  async function favoritar(indice: number) {
    if (resposta.estado !== "pronto") return;
    const v = resposta.variantes[indice];
    if (!v.id) return;
    const querida = !v.favorita;
    const marcar = (valor: boolean) =>
      setResposta((atual) =>
        atual.estado === "pronto"
          ? {
              ...atual,
              variantes: atual.variantes.map((x, j) =>
                j === indice ? { ...x, favorita: valor } : x,
              ),
            }
          : atual,
      );
    marcar(querida);
    const r = await fetch("/api/estudo/favorita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ varianteId: v.id, favorita: querida }),
    }).catch(() => null);
    if (!r || !r.ok) marcar(!querida);
  }

  async function desenhar(e: React.FormEvent) {
    e.preventDefault();
    if (!fichaCompleta) {
      setResposta({
        estado: "erro",
        mensagem:
          "Sem a Ficha Técnica o sistema não desenha (Art. 110): preencha recuo frontal, ocupação, coeficiente, permeabilidade e a data de emissão — os valores vêm da prefeitura, lote a lote.",
      });
      return;
    }
    setResposta({ estado: "desenhando" });

    const corpo = {
      lote: {
        largura: numero(largura),
        profundidade: numero(profundidade),
        orientacaoNorte: norte || undefined,
      },
      ficha: {
        recuoFrontal: numero(fichaRecuo),
        taxaOcupacaoMax: numero(fichaTaxa) / 100,
        coeficienteAproveitamento: numero(fichaCA),
        permeabilidadeMinima: numero(fichaPerm) / 100,
        dataEmissao: fichaData,
      },
      programa: programa
        .filter((l) => l.qtd > 0)
        .map<ItemPrograma>((l) => ({
          tipo: l.tipo,
          quantidade: Math.round(l.qtd),
          areaMin: l.min,
          areaAlvo: l.alvo,
        })),
      quantidadeVariantes: 6,
      clienteId: clienteId || null,
      casaAcessivel,
    };

    try {
      const r = await fetch("/api/estudo/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await r.json();

      if (r.ok) {
        setResposta({
          estado: "pronto",
          variantes: dados.variantes,
          norte: norte || undefined,
          calibrado: Boolean(dados.calibrado),
          loteUsado: {
            largura: numero(largura),
            profundidade: numero(profundidade),
          },
        });
        return;
      }
      if (dados.erro === "PROGRAMA_EXCEDE_ENVELOPE") {
        setResposta({
          estado: "erro",
          mensagem: `O programa não cabe no terreno: os cômodos pedem ao menos ${String(dados.areaNecessaria).replace(".", ",")} m² e o terreno permite ${String(dados.areaDisponivel).replace(".", ",")} m² de construção. Tire cômodos, diminua áreas ou confira a Ficha Técnica.`,
        });
      } else if (dados.erro === "SEM_VARIANTE_VALIDA") {
        setResposta({
          estado: "erro",
          mensagem:
            "O programa cabe no terreno, mas nenhuma planta fechou respeitando todas as regras (mobiliário, aberturas na divisa, vaga, quintal). Ajuste as áreas ou o número de cômodos e tente de novo.",
        });
      } else if (
        dados.erro === "PROGRAMA_INVALIDO" ||
        dados.erro === "FICHA_OBRIGATORIA"
      ) {
        setResposta({
          estado: "erro",
          mensagem: `Confira o que foi preenchido: ${dados.detalhe}.`,
        });
      } else {
        setResposta({
          estado: "erro",
          mensagem:
            "Não deu para gerar o estudo. Confira os números e tente de novo.",
        });
      }
    } catch {
      setResposta({
        estado: "erro",
        mensagem: "Sem resposta do servidor. Tente de novo em instantes.",
      });
    }
  }

  return (
    <div className="mt-7 grid items-start gap-8 lg:grid-cols-[330px_minmax(0,1fr)]">
      {/* ---- o pedido ------------------------------------------------- */}
      <form onSubmit={desenhar} className="lg:sticky lg:top-2">
        <p className="rotulo">O terreno</p>
        <div
          className="carimbo mt-2 overflow-hidden rounded-mod"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          <div className="carimbo-cel col-span-2">
            <span className="carimbo-rot">O lote visto de cima</span>
            <CroquiLote
              largura={numero(largura)}
              profundidade={numero(profundidade)}
              recuoFrontal={numero(fichaRecuo)}
              recuoFundos={PARAMETROS.implantacao.quintalMinimo}
              recuoEsquerda={0}
              recuoDireita={0}
              taxa={numero(fichaTaxa)}
              norte={norte || undefined}
            />
          </div>
          <Cel rotulo="Lote típico" span={2}>
            <select
              className="campo-cel"
              value={presetId}
              onChange={(e) => aplicarPreset(e.target.value)}
            >
              <option value="">— medidas próprias —</option>
              {PRESETS_LOTE.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </Cel>
          <CelMedida rotulo="Largura" valor={largura} aoMudar={setLargura} />
          <CelMedida
            rotulo="Profundidade"
            valor={profundidade}
            aoMudar={setProfundidade}
          />
          <Cel rotulo="O norte está…" span={2}>
            <select
              className="campo-cel"
              value={norte}
              onChange={(e) => setNorte(e.target.value as OrientacaoNorte | "")}
            >
              {NORTES.map((n) => (
                <option key={n.v} value={n.v}>
                  {n.r}
                </option>
              ))}
            </select>
          </Cel>
        </div>

        {/* Ficha Técnica: os parâmetros da zona vêm da prefeitura, lote a
            lote — sem eles o sistema não desenha (Art. 110). */}
        <p className="rotulo mt-5">
          Ficha Técnica do lote — copie da prefeitura
        </p>
        <div
          className="carimbo mt-2 overflow-hidden rounded-mod"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          <CelMedida
            rotulo="Recuo frontal"
            valor={fichaRecuo}
            aoMudar={setFichaRecuo}
            placeholder="—"
          />
          <CelMedida
            rotulo="Ocupação máx."
            valor={fichaTaxa}
            aoMudar={setFichaTaxa}
            sufixo="%"
            placeholder="—"
          />
          <CelMedida
            rotulo="Coef. aproveitamento"
            valor={fichaCA}
            aoMudar={setFichaCA}
            sufixo="×"
            placeholder="—"
          />
          <CelMedida
            rotulo="Permeabilidade mín."
            valor={fichaPerm}
            aoMudar={setFichaPerm}
            sufixo="%"
            placeholder="—"
          />
          <Cel
            rotulo="Data de emissão da ficha"
            span={2}
            title="A Ficha Técnica vale 90 dias (Art. 110)"
          >
            <input
              className="campo-cel"
              type="date"
              value={fichaData}
              onChange={(e) => setFichaData(e.target.value)}
            />
          </Cel>
        </div>
        {fichaVencida ? (
          <p className="mt-2 border-l-2 border-ferrugem bg-ferrugem-fundo px-3 py-1.5 text-[12px] text-ferrugem">
            Ficha com mais de 90 dias — vencida (Art. 110). Peça uma nova
            antes de protocolar.
          </p>
        ) : null}

        {/* O programa como anotação de prancha: cada cômodo é uma célula
            "qtd × m²". Cômodo fora do programa (qtd 0) fica esmaecido. */}
        <p className="rotulo mt-5 flex items-baseline justify-between gap-3">
          <span>A casa — qtd. × m² alvo</span>
          <span
            className={`dado normal-case tracking-normal ${
              programaCabe ? "text-tinta-fraca" : "text-ferrugem"
            }`}
          >
            ≈ {Math.round(alvoPrograma)} m²
            {areaDisponivel === null
              ? ""
              : programaCabe
                ? " · cabe"
                : ` · passa dos ${areaDisponivel} m²`}
          </span>
        </p>
        <div
          className="carimbo mt-2 overflow-hidden rounded-mod"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          {programa.map((linha, i) => (
            <label
              key={linha.tipo}
              className={`carimbo-cel block ${linha.qtd === 0 ? "opacity-55" : ""}`}
            >
              <span className="carimbo-rot">{linha.rotulo}</span>
              <span className="flex items-baseline gap-1.5">
                <input
                  className="campo-cel text-right"
                  style={{ width: 26 }}
                  inputMode="numeric"
                  value={String(linha.qtd)}
                  aria-label={`Quantidade de ${linha.rotulo}`}
                  onChange={(e) => mudarLinha(i, "qtd", e.target.value)}
                />
                <span className="dado shrink-0 text-[10px] text-tinta-fraca">
                  ×
                </span>
                <input
                  className="campo-cel text-right"
                  style={{ width: 40 }}
                  inputMode="decimal"
                  value={String(linha.alvo).replace(".", ",")}
                  aria-label={`Área alvo de ${linha.rotulo}`}
                  onChange={(e) => mudarLinha(i, "alvo", e.target.value)}
                />
                <span className="dado shrink-0 text-[10px] text-tinta-fraca">
                  m²
                </span>
              </span>
            </label>
          ))}

          <label className="carimbo-cel col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={casaAcessivel}
              onChange={(e) => setCasaAcessivel(e.target.checked)}
            />
            <span className="text-[13px] text-tinta-media">
              Casa acessível (NBR 9050 — giro de 1,50 m e portas de 0,80 m)
            </span>
          </label>

          {clientes.length > 0 ? (
            <Cel rotulo="Cliente (opcional)" span={2}>
              <select
                className="campo-cel"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">— sem cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Cel>
          ) : null}

          {/* o carimbo fecha com o bloco de tinta — que aqui é a ação */}
          <button
            type="submit"
            disabled={resposta.estado === "desenhando"}
            className="carimbo-cel dado col-span-2 bg-tinta py-2.5 text-center text-[11px] uppercase tracking-[0.18em] text-painel transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {resposta.estado === "desenhando"
              ? "Desenhando…"
              : "Desenhar plantas"}
          </button>
        </div>
      </form>

      {/* ---- as opções ------------------------------------------------ */}
      <div>
        {resposta.estado === "vazio" ? (
          <div className="folha-branca relative overflow-hidden">
            {FANTASMA ? (
              <div
                aria-hidden
                className="pointer-events-none mx-auto max-w-[400px] opacity-[0.13]"
              >
                <PlantaSVG
                  variante={FANTASMA}
                  lote={{ largura: 12, profundidade: 30 }}
                />
              </div>
            ) : null}
            <div
              className={
                FANTASMA
                  ? "absolute inset-0 flex flex-col items-center justify-center"
                  : ""
              }
            >
              As opções de planta aparecem aqui.
              <p className="folha-branca-nota">
                preencha a Ficha Técnica — sem ela o sistema não desenha
              </p>
            </div>
          </div>
        ) : null}

        {resposta.estado === "desenhando" ? (
          <div className="folha-branca">
            Desenhando as opções…
            <p className="folha-branca-nota">quase sempre leva menos de 3 s</p>
          </div>
        ) : null}

        {resposta.estado === "erro" ? (
          <div className="rounded-mod border-l-2 border-ferrugem bg-ferrugem-fundo px-4 py-3 text-[13.5px] text-ferrugem">
            {resposta.mensagem}
          </div>
        ) : null}

        {resposta.estado === "pronto" ? (
          <div>
            <div className="flex items-baseline gap-4">
              <span className="rotulo">
                {String(resposta.variantes.length).padStart(2, "0")} opções — da
                melhor para a pior nota
                {resposta.calibrado ? " · nota calibrada pelas favoritas" : ""}
              </span>
              <span className="guia" aria-hidden />
            </div>
            <div className="escada mt-4 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {resposta.variantes.map((v, i) => (
                <article
                  key={v.seed}
                  style={{ animationDelay: `${90 + i * 70}ms` }}
                  className="registro relative flex flex-col border border-traco bg-painel p-px transition-colors hover:border-traco-forte"
                >
                  <div className="flex flex-1 items-center px-4 pb-2 pt-4">
                    <PlantaSVG
                      variante={v}
                      norte={resposta.norte}
                      lote={resposta.loteUsado}
                    />
                  </div>
                  {/* mini-carimbo da opção */}
                  <div className="flex items-stretch border-t border-traco">
                    <span className="folha-num !min-w-[42px] rounded-none">
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      <span>opção</span>
                    </span>
                    <span className="flex flex-1 items-center justify-between gap-3 px-3">
                      <span className="dado text-[12px] text-tinta">
                        nota {v.score}
                      </span>
                      <span className="dado text-[12px] text-tinta-media">
                        {v.areaConstruida.toFixed(1).replace(".", ",")} m²
                      </span>
                      <span className="dado text-[11px] text-tinta-fraca">
                        seed {v.seed}
                      </span>
                      <button
                        type="button"
                        disabled={!v.id}
                        aria-pressed={Boolean(v.favorita)}
                        onClick={() => favoritar(i)}
                        title={
                          v.id
                            ? v.favorita
                              ? "Tirar das favoritas"
                              : "Guardar como favorita — ensina o motor"
                            : "Rode a migration 0002 no Supabase para favoritar"
                        }
                        className={`-mr-1 px-1 text-[17px] leading-none transition-colors disabled:opacity-30 ${
                          v.favorita
                            ? "text-tinta"
                            : "text-tinta-fraca hover:text-tinta"
                        }`}
                      >
                        {v.favorita ? "★" : "☆"}
                      </button>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
