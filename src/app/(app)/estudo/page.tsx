import { criarClienteServidor } from "@/lib/supabase/server";
import { TituloPagina } from "@/components/bloco";
import { Gerador } from "./gerador";

export const dynamic = "force-dynamic";

export default async function EstudoPage() {
  const supabase = await criarClienteServidor();

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome")
    .order("nome");

  return (
    <div>
      <TituloPagina
        folha="05"
        eyebrow="Estudo preliminar"
        titulo="Estudo"
        acoes={
          <span className="text-[12px] text-tinta-fraca">
            ponto de partida, não projeto
          </span>
        }
      />

      <p className="mt-5 max-w-[560px] text-[14px] text-tinta-media">
        Preencha o terreno e o que a casa precisa ter. O sistema desenha em
        segundos as primeiras opções de planta térrea — escolha a melhor para
        refinar no CAD.
      </p>

      <Gerador clientes={clientes ?? []} />
    </div>
  );
}
