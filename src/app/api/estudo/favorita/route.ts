/* =====================================================================
   POST /api/estudo/favorita
   Marca ou desmarca uma variante como favorita. É o gesto que ensina o
   motor: as favoritas calibram os pesos do score das próximas gerações.
   ===================================================================== */

import { criarClienteServidor } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ erro: "NAO_AUTENTICADO" }, { status: 401 });
  }

  let corpo: { varianteId?: unknown; favorita?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "CORPO_INVALIDO" }, { status: 400 });
  }
  const varianteId = corpo.varianteId;
  const favorita = corpo.favorita;
  if (typeof varianteId !== "string" || typeof favorita !== "boolean") {
    return Response.json({ erro: "CORPO_INVALIDO" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("variantes")
    .update({ favorita })
    .eq("id", varianteId)
    .select("id");

  if (error || !data || data.length === 0) {
    return Response.json({ erro: "VARIANTE_NAO_ENCONTRADA" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
