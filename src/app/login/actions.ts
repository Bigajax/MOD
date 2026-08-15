"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { configOk } from "@/lib/supabase/config";

export type EstadoLogin = { erro: string | null };

export async function entrar(
  _anterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  if (!configOk()) {
    return {
      erro:
        "NEXT_PUBLIC_SUPABASE_ANON_KEY está sem valor válido em .env.local. " +
        "Nenhuma senha entra até essa chave ser preenchida.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: "E-mail ou senha não conferem." };
  }

  revalidatePath("/", "layout");
  redirect("/hoje");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
