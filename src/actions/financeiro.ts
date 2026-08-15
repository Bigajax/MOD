"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/format";
import type { Resultado } from "./comercial";

/** R5 — 'atrasada' não existe aqui. Só prevista → faturada → paga. */
export async function mudarStatusParcela(
  parcelaId: string,
  status: string,
  projetoId: string,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();

  const patch: Record<string, string | null> = { status };
  patch.data_pagamento = status === "paga" ? hojeISO() : null;

  const { error } = await supabase
    .from("parcelas")
    .update(patch)
    .eq("id", parcelaId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/hoje");
  return { ok: true };
}
