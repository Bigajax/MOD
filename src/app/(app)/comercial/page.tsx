import { criarClienteServidor } from "@/lib/supabase/server";
import { CarimboFolha } from "@/components/carimbo";
import { brl, diasDesde } from "@/lib/format";
import { Quadro, type CardOportunidade } from "./quadro";

export const dynamic = "force-dynamic";

export default async function ComercialPage() {
  const supabase = await criarClienteServidor();

  const [oportunidades, clientes] = await Promise.all([
    supabase
      .from("oportunidades")
      .select(
        "id, titulo, tipo_projeto, area_m2, valor_proposta, etapa, ultimo_contato, proximo_followup, motivo_perda, cliente_id, clientes(nome, telefone, email, origem)",
      )
      .order("ultimo_contato", { ascending: true }),
    supabase.from("clientes").select("id, nome").order("nome"),
  ]);

  const cards = (oportunidades.data ?? []) as unknown as CardOportunidade[];

  const emJogo = cards.filter(
    (c) => c.etapa !== "perdido" && c.etapa !== "ganho",
  );
  const somaEmJogo = emJogo.reduce(
    (s, c) => s + Number(c.valor_proposta ?? 0),
    0,
  );
  const paradas = emJogo.filter((c) => diasDesde(c.ultimo_contato) >= 14).length;

  return (
    <div>
      <Quadro cards={cards} clientes={clientes.data ?? []} />

      <CarimboFolha
        folha="02/05"
        celulas={[
          { rotulo: "Em jogo", valor: String(emJogo.length).padStart(2, "0") },
          { rotulo: "Em proposta", valor: brl(somaEmJogo) },
          {
            rotulo: "Paradas 14d+",
            valor: String(paradas).padStart(2, "0"),
            furado: paradas > 0,
          },
          {
            rotulo: "Perdidas",
            valor: String(
              cards.filter((c) => c.etapa === "perdido").length,
            ).padStart(2, "0"),
          },
        ]}
      />
    </div>
  );
}
