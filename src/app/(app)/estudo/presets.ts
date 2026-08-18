/* =====================================================================
   Presets de terreno: só as MEDIDAS do lote. Recuo frontal, taxa,
   coeficiente e permeabilidade vêm da Ficha Técnica do lote (Art. 110)
   e nunca de preset — o formulário exige a Ficha preenchida.
   ===================================================================== */

export type PresetLote = {
  id: string;
  rotulo: string;
  largura: number;
  profundidade: number;
};

export const PRESETS_LOTE: PresetLote[] = [
  { id: "urbano-12x30", rotulo: "Lote urbano 12×30", largura: 12, profundidade: 30 },
  { id: "estreito-10x25", rotulo: "Lote estreito 10×25", largura: 10, profundidade: 25 },
  { id: "largo-15x30", rotulo: "Lote largo 15×30", largura: 15, profundidade: 30 },
  { id: "amplo-20x40", rotulo: "Lote amplo 20×40", largura: 20, profundidade: 40 },
];
