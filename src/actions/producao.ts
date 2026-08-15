"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/format";
import type { Resultado } from "./comercial";

const ORG = "11111111-1111-1111-1111-111111111111";

/** R2 — a transição carimba a data e devolve a parcela que pode ser faturada. */
export async function mudarStatusEtapa(
  etapaId: string,
  status: string,
): Promise<Resultado & { parcelaId?: string; parcelaDescricao?: string }> {
  const supabase = await criarClienteServidor();

  const patch: Record<string, string | null> = { status };
  if (status === "aguardando_aprovacao") patch.data_entrega = hojeISO();
  if (status === "aprovada" || status === "concluida") {
    patch.data_aprovacao = hojeISO();
  }

  const { data, error } = await supabase
    .from("etapas")
    .update(patch)
    .eq("id", etapaId)
    .select("projeto_id")
    .single();

  if (error) return { ok: false, erro: error.message };

  revalidatePath(`/projetos/${data.projeto_id}`);
  revalidatePath("/projetos");
  revalidatePath("/hoje");

  if (status !== "aguardando_aprovacao") return { ok: true };

  const { data: parcela } = await supabase
    .from("parcelas")
    .select("id, descricao")
    .eq("etapa_id", etapaId)
    .eq("status", "prevista")
    .maybeSingle();

  return {
    ok: true,
    parcelaId: parcela?.id,
    parcelaDescricao: parcela?.descricao,
  };
}

export async function definirPrazoEtapa(
  etapaId: string,
  prazo: string | null,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("etapas")
    .update({ prazo })
    .eq("id", etapaId)
    .select("projeto_id")
    .single();

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/projetos/${data.projeto_id}`);
  revalidatePath("/hoje");
  return { ok: true };
}

export async function alternarTarefa(
  tarefaId: string,
  concluida: boolean,
  projetoId: string,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("tarefas")
    .update({ concluida })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/projetos/${projetoId}`);
  return { ok: true };
}

export async function criarTarefa(
  etapaId: string,
  titulo: string,
  projetoId: string,
): Promise<Resultado> {
  const texto = titulo.trim();
  if (!texto) return { ok: false, erro: "Escreva a tarefa." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("tarefas")
    .insert({ org_id: ORG, etapa_id: etapaId, titulo: texto });

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/projetos/${projetoId}`);
  return { ok: true };
}

export async function removerTarefa(
  tarefaId: string,
  projetoId: string,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("tarefas").delete().eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/projetos/${projetoId}`);
  return { ok: true };
}

export async function salvarLinkDrive(
  projetoId: string,
  link: string,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("projetos")
    .update({ link_drive: link.trim() || null })
    .eq("id", projetoId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/projetos/${projetoId}`);
  return { ok: true };
}
