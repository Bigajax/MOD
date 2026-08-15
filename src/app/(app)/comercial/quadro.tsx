"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  moverOportunidade,
  marcarPerdida,
  converterEmProjeto,
} from "@/actions/comercial";
import { brl, diasDesde, hojeISO } from "@/lib/format";
import { TOM_COMERCIAL, tomParado } from "@/lib/status";
import { Selo, TituloPagina } from "@/components/bloco";
import { Valor } from "@/components/valor";
import { Rolagem } from "@/components/rolagem";
import { ModalGanho } from "./modal-ganho";
import { ModalPerda } from "./modal-perda";
import { ModalNova } from "./modal-nova";
import { ModalOportunidade } from "./modal-oportunidade";

export type CardOportunidade = {
  id: string;
  titulo: string;
  tipo_projeto: string;
  area_m2: number | null;
  valor_proposta: number | null;
  etapa: string;
  ultimo_contato: string;
  proximo_followup: string | null;
  motivo_perda: string | null;
  cliente_id: string;
  clientes: {
    nome: string;
    telefone: string | null;
    email: string | null;
    origem: string;
  } | null;
};

const COLUNAS = [
  { id: "lead", rotulo: "Lead" },
  { id: "contato", rotulo: "Contato" },
  { id: "reuniao", rotulo: "Reunião" },
  { id: "briefing", rotulo: "Briefing" },
  { id: "proposta", rotulo: "Proposta" },
  { id: "negociacao", rotulo: "Negociação" },
  { id: "ganho", rotulo: "Ganho" },
];

function Card({
  card,
  arrastando,
}: {
  card: CardOportunidade;
  arrastando?: boolean;
}) {
  const parado = diasDesde(card.ultimo_contato);
  // R4 — 7 dias vira aviso, 14 vira alarme.
  const tom = tomParado(parado);

  return (
    <article
      className={`overflow-hidden rounded-mod border border-traco bg-painel shadow-[0_1px_2px_0_rgba(0,0,0,0.08)] ${
        arrastando ? "opacity-40" : ""
      }`}
    >
      {/* faixa de status na cabeça do card, como num quadro de produção */}
      <div
        className="h-1"
        style={{ background: `var(--color-st-${tom})` }}
        aria-hidden
      />
      <div className="px-3 pb-3 pt-2.5">
        <p className="nome truncate text-[13px] leading-snug text-tinta">
          {card.clientes?.nome ?? "Sem cliente"}
        </p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-tinta-media">
          {card.titulo}
        </p>
      </div>

      {/* pé de carimbo: mesma construção rulada do carimbo grande */}
      <div className="grid grid-cols-[1fr_auto] border-t border-tinta">
        <div className="border-r border-tinta px-3 py-1.5">
          <p className="carimbo-rot">Proposta</p>
          <Valor reais={card.valor_proposta} tamanho={17} />
        </div>
        <div className="px-3 py-1.5">
          <p className="carimbo-rot">Parado</p>
          <p className="mt-0.5">
            <Selo tom={tom}>{String(parado).padStart(2, "0")}d</Selo>
          </p>
        </div>
      </div>
    </article>
  );
}

function CardArrastavel({
  card,
  onAbrir,
}: {
  card: CardOportunidade;
  onAbrir: (card: CardOportunidade) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });

  // O sensor só inicia o arrasto depois de 5px, então o clique parado
  // continua sendo clique. Só ignoramos se o arrasto de fato começou.
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      data-nao-puxar
      onClick={() => {
        if (!isDragging) onAbrir(card);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir(card);
        }
      }}
      className="cursor-pointer"
    >
      <Card card={card} arrastando={isDragging} />
    </div>
  );
}

function Coluna({
  id,
  rotulo,
  cards,
  tom,
  onAbrir,
}: {
  id: string;
  rotulo: string;
  cards: CardOportunidade[];
  tom: string;
  onAbrir: (card: CardOportunidade) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const soma = cards.reduce((s, c) => s + Number(c.valor_proposta ?? 0), 0);

  return (
    <div className="flex w-[204px] shrink-0 flex-col overflow-hidden rounded-mod border border-traco bg-rail">
      {/* cabeçalho chapado na cor da etapa: o funil vira rampa de cor */}
      <div
        className="px-3 py-2.5"
        style={{
          background: `var(--color-st-${tom})`,
          color: `var(--color-st-${tom}-tx)`,
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[14px] font-medium uppercase leading-none tracking-[0.13em]">
            {rotulo}
          </span>
          <span className="dado text-[13px] font-semibold">
            {String(cards.length).padStart(2, "0")}
          </span>
        </div>
        <p className="dado mt-1.5 text-[11px] opacity-80">
          {soma > 0 ? brl(soma) : "—"}
        </p>
      </div>

      <div
        ref={setNodeRef}
        className={`sem-barra flex max-h-[calc(100svh-24rem)] min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors ${
          isOver ? "bg-azul-fundo" : ""
        }`}
      >
        {cards.map((card) => (
          <CardArrastavel key={card.id} card={card} onAbrir={onAbrir} />
        ))}
        {cards.length === 0 ? (
          <p className="dado px-1 pt-1 text-[10px] uppercase tracking-[0.12em] text-tinta-fraca">
            vazia
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Quadro({
  cards,
  clientes,
}: {
  cards: CardOportunidade[];
  clientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [local, setLocal] = useState(cards);
  const [ativo, setAtivo] = useState<CardOportunidade | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ganho, setGanho] = useState<CardOportunidade | null>(null);
  const [perda, setPerda] = useState<CardOportunidade | null>(null);
  const [nova, setNova] = useState(false);
  const [ficha, setFicha] = useState<CardOportunidade | null>(null);
  const [verPerdidas, setVerPerdidas] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // O servidor é a fonte da verdade; o estado local só existe para o
  // otimismo do arrasto.
  const sincronizados = useMemo(() => {
    const porId = new Map(local.map((c) => [c.id, c]));
    return cards.map((c) => porId.get(c.id) ?? c);
  }, [cards, local]);

  const perdidas = sincronizados.filter((c) => c.etapa === "perdido");

  function aoSoltar(evento: DragEndEvent) {
    setAtivo(null);
    const destino = evento.over?.id;
    if (!destino) return;

    const card = sincronizados.find((c) => c.id === evento.active.id);
    if (!card || card.etapa === destino) return;

    // Ganho e perdido não são movimentos simples: um gera contrato, o outro
    // exige motivo. Os dois passam por modal antes de tocar o banco.
    if (destino === "ganho") {
      setGanho(card);
      return;
    }
    if (destino === "perdido") {
      setPerda(card);
      return;
    }

    setErro(null);
    const antes = sincronizados;
    setLocal(
      sincronizados.map((c) =>
        c.id === card.id
          ? { ...c, etapa: String(destino), ultimo_contato: hojeISO() }
          : c,
      ),
    );

    iniciar(async () => {
      const r = await moverOportunidade(card.id, String(destino));
      if (!r.ok) {
        setLocal(antes);
        setErro(r.erro ?? "Não deu para mover.");
        return;
      }
      router.refresh();
    });
  }

  function aoPegar(evento: DragStartEvent) {
    setAtivo(sincronizados.find((c) => c.id === evento.active.id) ?? null);
  }

  return (
    <>
      <TituloPagina
        folha="02"
        eyebrow="Funil"
        titulo="Comercial"
        acoes={
          <>
            <button onClick={() => setNova(true)} className="acao acao-cheia">
              + Oportunidade
            </button>
            <button
              onClick={() => setVerPerdidas((v) => !v)}
              className="acao"
              aria-pressed={verPerdidas}
            >
              Perdidas · {perdidas.length}
            </button>
          </>
        }
      />

      {erro ? (
        <p className="mt-3 text-[12px] text-ferrugem">{erro}</p>
      ) : null}

      {verPerdidas ? (
        <div className="mt-5 rounded-mod border border-traco bg-painel p-4">
          <p className="rotulo">Perdidas · motivo declarado</p>
          {perdidas.length === 0 ? (
            <p className="mt-3 text-[13px] text-tinta-fraca">
              Nenhuma perda registrada.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {perdidas.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-baseline gap-x-3 border-b border-traco pb-2 text-[13px]"
                >
                  <span className="text-tinta">{c.clientes?.nome}</span>
                  <span className="dado text-[11px] text-tinta-fraca">
                    {brl(c.valor_proposta)}
                  </span>
                  <span className="text-[12px] text-ferrugem">
                    {c.motivo_perda}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* id fixo: sem ele o dnd-kit numera o aria-describedby com um contador
          próprio e servidor e cliente divergem na hidratação. */}
      <DndContext
        id="funil-comercial"
        sensors={sensors}
        onDragStart={aoPegar}
        onDragEnd={aoSoltar}
      >
        {/* O quadro sai da coluna de texto e vai até a borda da janela.
            Sem barra: puxa-se o vazio entre as colunas para andar. */}
        <Rolagem className="-mr-5 mt-5 flex items-stretch gap-2.5 overflow-x-auto pb-4 pr-5 sm:-mr-9 sm:pr-9">
          {COLUNAS.map((coluna) => (
            <Coluna
              key={coluna.id}
              id={coluna.id}
              rotulo={coluna.rotulo}
              tom={TOM_COMERCIAL[coluna.id] ?? "nulo"}
              cards={sincronizados.filter((c) => c.etapa === coluna.id)}
              onAbrir={setFicha}
            />
          ))}

          {/* Perdido fica fora do quadro: não é etapa, é saída. */}
          <ColunaPerdido />
        </Rolagem>

        <DragOverlay>{ativo ? <Card card={ativo} /> : null}</DragOverlay>
      </DndContext>

      {ficha ? (
        <ModalOportunidade
          card={ficha}
          onFechar={() => setFicha(null)}
          onMudou={() => {
            setFicha(null);
            router.refresh();
          }}
          onGanho={() => {
            setGanho(ficha);
            setFicha(null);
          }}
          onPerda={() => {
            setPerda(ficha);
            setFicha(null);
          }}
        />
      ) : null}

      {ganho ? (
        <ModalGanho
          card={ganho}
          onFechar={() => setGanho(null)}
          onConfirmar={async (dados) => {
            const r = await converterEmProjeto({
              oportunidadeId: ganho.id,
              ...dados,
            });
            if (r.ok) {
              setGanho(null);
              router.push(`/projetos/${r.id}`);
            }
            return r;
          }}
        />
      ) : null}

      {perda ? (
        <ModalPerda
          card={perda}
          onFechar={() => setPerda(null)}
          onConfirmar={async (motivo) => {
            const r = await marcarPerdida(perda.id, motivo);
            if (r.ok) {
              setPerda(null);
              router.refresh();
            }
            return r;
          }}
        />
      ) : null}

      {nova ? (
        <ModalNova
          clientes={clientes}
          onFechar={() => setNova(false)}
          onCriado={() => {
            setNova(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function ColunaPerdido() {
  const { setNodeRef, isOver } = useDroppable({ id: "perdido" });

  return (
    <div className="ml-4 flex w-[204px] shrink-0 flex-col overflow-hidden rounded-mod border border-dashed border-traco-forte">
      <div
        className="px-3 py-2.5"
        style={{
          background: "var(--color-st-alerta)",
          color: "var(--color-st-alerta-tx)",
        }}
      >
        <span className="font-display text-[14px] font-medium uppercase leading-none tracking-[0.13em]">
          Perdido
        </span>
        <p className="dado mt-1.5 text-[11px] opacity-85">fora do funil</p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[220px] flex-1 items-center justify-center p-3 text-center transition-colors ${
          isOver ? "bg-ferrugem-fundo" : ""
        }`}
      >
        <span className="dado text-[10px] uppercase leading-relaxed tracking-[0.12em] text-tinta-fraca">
          solte aqui
          <br />e declare o motivo
        </span>
      </div>
    </div>
  );
}
