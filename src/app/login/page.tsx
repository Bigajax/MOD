import { FormularioLogin } from "./formulario-login";
import { configOk } from "@/lib/supabase/config";
import { MargemFolha } from "@/components/carimbo";
import { AneisMod } from "@/components/aneis-mod";

const ESCADA = ["MOD", "MODO", "MODELO", "MODERNO", "MODIFICA"];

export default function LoginPage() {
  return (
    <main className="fixed inset-[13px] flex flex-col overflow-hidden border border-tinta bg-painel">
      {/* A textura oficial da capa: anéis em tinta sobre o papel, meia fora
          da folha, como nos backgrounds do manual. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-13%] top-1/2 w-[min(58vw,660px)] -translate-y-1/2 text-tinta opacity-[0.09]"
      >
        <AneisMod className="aneis-surgir h-auto w-full" />
      </div>

      {/* Timbre da folha, igual ao do sistema por dentro. */}
      <div className="border-b border-traco px-6 pt-4 sm:px-9">
        <div className="flex items-baseline justify-between gap-4">
          <span className="dado text-[10px] uppercase tracking-[0.24em] text-tinta-fraca">
            MOD · Arquitetura
          </span>
          <span className="dado text-[10px] uppercase tracking-[0.24em] text-tinta-fraca">
            Acesso restrito
          </span>
        </div>
        <div className="pb-2 pt-3">
          <MargemFolha />
        </div>
      </div>

      <div className="sem-barra grid flex-1 items-center gap-10 overflow-y-auto px-6 py-10 sm:px-9 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <section>
          <div className="escada">
            {ESCADA.map((palavra, i) => (
              <p
                key={palavra}
                style={{ animationDelay: `${120 + i * 85}ms` }}
                className="font-display text-[clamp(2.3rem,7vw,4.4rem)] font-light leading-[1.1] tracking-[0.07em] text-tinta"
              >
                {palavra.slice(0, 3)}
                <span className="text-tinta-fraca">{palavra.slice(3)}</span>
              </p>
            ))}
            <p
              style={{ animationDelay: `${120 + ESCADA.length * 85}ms` }}
              className="dado mt-8 max-w-[36ch] text-[11px] uppercase leading-relaxed tracking-[0.16em] text-tinta-fraca"
            >
              Construindo histórias e transformando espaços
            </p>
          </div>
        </section>

        <section className="w-full max-w-[24rem] justify-self-end">
          {!configOk() ? (
            <p className="mb-5 border-l-2 border-ferrugem bg-ferrugem-fundo px-4 py-3 text-[13px] leading-relaxed text-ferrugem">
              Falta a chave <span className="dado">anon</span> do Supabase em{" "}
              <span className="dado">.env.local</span>. Sem ela nenhum login
              passa, independente da senha.
            </p>
          ) : null}

          <FormularioLogin />
        </section>
      </div>

      {/* Aba única: esta folha é a capa do conjunto. */}
      <div className="px-6 pb-4 sm:px-9">
        <span className="dado text-[10px] uppercase tracking-[0.24em] text-tinta-fraca">
          Folha 00 · Capa
        </span>
      </div>
    </main>
  );
}
