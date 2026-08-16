import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";
import { MarcaMod } from "@/components/marca-mod";
import { AneisMod } from "@/components/aneis-mod";
import { AbasFolha, CascaSecao } from "@/components/abas-folha";
import { TrocaTema } from "@/components/troca-tema";
import { MargemFolha } from "@/components/carimbo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <CascaSecao>
      {/* A janela inteira é a prancha. Nada rola fora da área de desenho. */}
      <div className="folha-quadro">
        <div className="folha-timbre relative overflow-hidden">
          {/* A textura dos backgrounds do manual: anéis sangrando na borda
              direita da capa, quase invisíveis — presença, não ruído. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 top-1/2 w-[440px] -translate-y-1/2 text-tinta opacity-[0.07]"
          >
            <AneisMod className="h-auto w-full" />
          </div>
          <div className="relative flex items-center justify-between gap-5 px-[var(--folha-margem)] py-2.5">
            <MarcaMod />
            <div className="flex items-center gap-5">
              <TrocaTema />
              <form action={sair}>
                <button
                  type="submit"
                  className="dado text-[11px] uppercase tracking-[0.14em] text-tinta-fraca transition-colors hover:text-ferrugem"
                >
                  {perfil?.nome ?? "conta"} · sair
                </button>
              </form>
            </div>
          </div>
          <div className="px-[var(--folha-margem)] pb-2">
            <MargemFolha />
          </div>
        </div>

        <div className="folha-desenho">
          {/* o pb reserva a tira do carimbo: o desenho não passa por baixo */}
          <div className="px-[var(--folha-margem)] pb-10 pt-6 lg:pb-[76px]">
            {children}
          </div>
        </div>
      </div>

      <AbasFolha />
    </CascaSecao>
  );
}
