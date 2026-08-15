import { criarClienteServidor } from "@/lib/supabase/server";
import { TituloPagina } from "@/components/bloco";
import { CarimboFolha } from "@/components/carimbo";
import { QuadroProjetos, type ProjetoQuadro } from "./quadro-projetos";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("projetos")
    .select(
      "id, nome, tipo_projeto, valor_contrato, prazo_final, status, clientes(nome), etapas(nome, status, prazo, ordem), parcelas(valor, status)",
    )
    .order("created_at", { ascending: false });

  const projetos = (data ?? []) as unknown as ProjetoQuadro[];
  const carteira = projetos.reduce((s, p) => s + Number(p.valor_contrato), 0);
  const recebido = projetos.reduce(
    (s, p) =>
      s +
      p.parcelas
        .filter((x) => x.status === "paga")
        .reduce((t, x) => t + Number(x.valor), 0),
    0,
  );

  return (
    <div>
      <TituloPagina
        folha="03"
        eyebrow="Produção"
        titulo="Projetos"
        acoes={
          <span className="text-[12px] text-tinta-fraca">
            cada coluna é a etapa onde o projeto está parado
          </span>
        }
      />

      <QuadroProjetos projetos={projetos} />

      <CarimboFolha
        folha="03/04"
        celulas={[
          {
            rotulo: "Em carteira",
            valor: String(projetos.length).padStart(2, "0"),
          },
          { rotulo: "Contratado", valor: brl(carteira) },
          { rotulo: "Recebido", valor: brl(recebido) },
          { rotulo: "A receber", valor: brl(carteira - recebido) },
        ]}
      />
    </div>
  );
}
