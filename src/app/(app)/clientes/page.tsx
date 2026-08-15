import { criarClienteServidor } from "@/lib/supabase/server";
import { TituloPagina } from "@/components/bloco";
import { CarimboFolha } from "@/components/carimbo";
import { brl } from "@/lib/format";
import { TabelaClientes, type ClienteLinha } from "./tabela-clientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("clientes")
    .select(
      "id, nome, tipo_pessoa, telefone, email, origem, oportunidades(id, etapa, valor_proposta), projetos(id, nome, valor_contrato)",
    )
    .order("nome");

  const clientes = (data ?? []) as unknown as ClienteLinha[];

  return (
    <div>
      <TituloPagina folha="04" eyebrow="Cadastro" titulo="Clientes" />
      <TabelaClientes clientes={clientes} />

      <CarimboFolha
        folha="04/04"
        celulas={[
          {
            rotulo: "Cadastrados",
            valor: String(clientes.length).padStart(2, "0"),
          },
          {
            rotulo: "Com projeto",
            valor: String(
              clientes.filter((c) => c.projetos.length > 0).length,
            ).padStart(2, "0"),
          },
          {
            rotulo: "Só no funil",
            valor: String(
              clientes.filter(
                (c) =>
                  c.projetos.length === 0 &&
                  c.oportunidades.some(
                    (o) => o.etapa !== "ganho" && o.etapa !== "perdido",
                  ),
              ).length,
            ).padStart(2, "0"),
          },
          {
            rotulo: "Contratado",
            valor: brl(
              clientes.reduce(
                (s, c) =>
                  s +
                  c.projetos.reduce((t, p) => t + Number(p.valor_contrato), 0),
                0,
              ),
            ),
          },
        ]}
      />
    </div>
  );
}
