/* A textura do manual da marca: círculos concêntricos de traço fino, com a
   respiração crescendo do centro pra fora. É a assinatura gráfica da MOD nos
   backgrounds oficiais — aqui ela entra decorativa, meia fora da folha, na
   cor de quem a usa (currentColor). */
export function AneisMod({ className }: { className?: string }) {
  const raios: number[] = [];
  for (let r = 9, passo = 4.5; r < 418; passo *= 1.075, r += passo) {
    raios.push(Math.round(r * 10) / 10);
  }

  return (
    <svg
      viewBox="0 0 840 840"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {raios.map((r) => (
        <circle
          key={r}
          cx="420"
          cy="420"
          r={r}
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
