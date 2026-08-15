"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/format";

const ORG = "11111111-1111-1111-1111-111111111111";

export type Resultado = { ok: boolean; erro?: string; id?: string };

/** R4 — qualquer movimentação no funil atualiza o último contato. */
export async function moverOportunidade(
  id: string,
  etapa: string,
): Promise<Resultado> {
  if (etapa === "ganho") {
    return { ok: false, erro: "Ganho exige o formulário de contrato." };
  }
  if (etapa === "perdido") {
    return { ok: false, erro: "Perda exige motivo." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("oportunidades")
    .update({ etapa, ultimo_contato: hojeISO() })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/comercial");
  revalidatePath("/hoje");
  return { ok: true };
}

/** R4 — o botão que zera o contador de dias parado. */
export async function registrarContato(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("oportunidades")
    .update({ ultimo_contato: hojeISO() })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/comercial");
  revalidatePath("/hoje");
  return { ok: true };
}

export async function atualizarOportunidade(
  id: string,
  dados: {
    titulo: string;
    tipoProjeto: string;
    areaM2: number | null;
    valorProposta: number | null;
    proximoFollowup: string | null;
  },
): Promise<Resultado> {
  if (!dados.titulo.trim()) {
    return { ok: false, erro: "Descreva a oportunidade." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("oportunidades")
    .update({
      titulo: dados.titulo.trim(),
      tipo_projeto: dados.tipoProjeto,
      area_m2: dados.areaM2,
      valor_proposta: dados.valorProposta,
      proximo_followup: dados.proximoFollowup,
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/comercial");
  revalidatePath("/hoje");
  return { ok: true };
}

export async function atualizarContatoCliente(
  clienteId: string,
  dados: { telefone: string; email: string },
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("clientes")
    .update({
      telefone: dados.telefone.trim() || null,
      email: dados.email.trim() || null,
    })
    .eq("id", clienteId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/comercial");
  revalidatePath("/clientes");
  return { ok: true };
}

/** R6 — perder sem motivo não gera aprendizado nenhum, então não passa. */
export async function marcarPerdida(
  id: string,
  motivo: string,
): Promise<Resultado> {
  const texto = motivo.trim();
  if (texto.length < 3) {
    return { ok: false, erro: "Escreva o motivo da perda." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("oportunidades")
    .update({
      etapa: "perdido",
      motivo_perda: texto,
      ultimo_contato: hojeISO(),
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/comercial");
  revalidatePath("/hoje");
  return { ok: true };
}

/** R1 — a conversão inteira em uma transação, do lado do Postgres. */
export async function converterEmProjeto(dados: {
  oportunidadeId: string;
  nome: string;
  tipoProjeto: string;
  valorContrato: number;
  dataInicio: string;
}): Promise<Resultado> {
  if (!dados.nome.trim()) return { ok: false, erro: "Dê um nome ao projeto." };
  if (!(dados.valorContrato > 0)) {
    return { ok: false, erro: "O valor do contrato precisa ser maior que zero." };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("converter_oportunidade", {
    p_oportunidade_id: dados.oportunidadeId,
    p_nome: dados.nome.trim(),
    p_tipo_projeto: dados.tipoProjeto,
    p_valor_contrato: dados.valorContrato,
    p_data_inicio: dados.dataInicio,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/comercial");
  revalidatePath("/projetos");
  revalidatePath("/hoje");
  return { ok: true, id: data as string };
}

export async function criarOportunidade(dados: {
  clienteId: string | null;
  clienteNovo: string;
  origem: string;
  titulo: string;
  tipoProjeto: string;
  valorProposta: number | null;
  proximoFollowup: string | null;
}): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  let clienteId = dados.clienteId;

  if (!clienteId) {
    const nome = dados.clienteNovo.trim();
    if (!nome) return { ok: false, erro: "Escolha ou crie um cliente." };

    const { data, error } = await supabase
      .from("clientes")
      .insert({ org_id: ORG, nome, origem: dados.origem })
      .select("id")
      .single();

    if (error) return { ok: false, erro: error.message };
    clienteId = data.id;
  }

  if (!dados.titulo.trim()) {
    return { ok: false, erro: "Descreva a oportunidade." };
  }

  const { error } = await supabase.from("oportunidades").insert({
    org_id: ORG,
    cliente_id: clienteId,
    titulo: dados.titulo.trim(),
    tipo_projeto: dados.tipoProjeto,
    valor_proposta: dados.valorProposta,
    proximo_followup: dados.proximoFollowup,
    etapa: "lead",
    ultimo_contato: hojeISO(),
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/comercial");
  revalidatePath("/clientes");
  revalidatePath("/hoje");
  return { ok: true };
}
