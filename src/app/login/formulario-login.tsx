"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { entrar, type EstadoLogin } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="dado w-full border-x-[1.5px] border-b-[1.5px] border-tinta bg-tinta px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-painel transition-opacity hover:opacity-85 disabled:opacity-40"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

/* O acesso é a primeira célula do carimbo: os campos moram dentro do quadro
   ruído, com a marca em tinta cheia abrindo a linha — igual à tira que fecha
   toda folha do sistema. */
export function FormularioLogin() {
  const [estado, acao] = useActionState<EstadoLogin, FormData>(entrar, {
    erro: null,
  });

  return (
    <form action={acao}>
      <div className="carimbo grid-cols-[auto_1fr] overflow-hidden rounded-[2px]">
        <div className="carimbo-marca row-span-2">
          <span className="carimbo-marca-nome">MOD</span>
          <span className="carimbo-marca-sub">Arquitetura</span>
        </div>

        <label className="carimbo-cel block cursor-text">
          <span className="carimbo-rot">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="campo-cel"
            placeholder="socio@modarquitetura.com.br"
          />
        </label>

        <label className="carimbo-cel block cursor-text">
          <span className="carimbo-rot">Senha</span>
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="campo-cel"
            placeholder="••••••••"
          />
        </label>
      </div>

      <Botao />

      {estado.erro ? (
        <p
          role="alert"
          className="mt-4 border-l-2 border-ferrugem bg-ferrugem-fundo px-3 py-2 text-[13px] text-ferrugem"
        >
          {estado.erro}
        </p>
      ) : null}
    </form>
  );
}
