/* O logotipo do manual (seção 06, "versão completa"): placa arredondada em
   tinta cheia, MOD grande e ARQUITETURA espaçada embaixo, texto vazado —
   a aplicação escura da página 37. O raio grande é exceção deliberada ao
   radius de 2px do sistema: é o desenho do logo, não um componente. */
export function MarcaMod() {
  return (
    <span className="inline-flex flex-col items-center rounded-[11px] bg-tinta px-4 pb-[7px] pt-[5px] leading-none">
      <span className="font-display text-[21px] tracking-[0.04em] text-painel">
        MOD
      </span>
      <span className="mr-[-0.24em] mt-[3px] font-display text-[6.8px] tracking-[0.24em] text-painel">
        ARQUITETURA
      </span>
    </span>
  );
}
