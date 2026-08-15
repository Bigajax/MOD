import type { Metadata } from "next";
import { Jost, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { scriptTema } from "@/components/troca-tema";
import "./globals.css";

/* Jost é revival de Futura — é a geometria do próprio logo da MOD. */
const jost = Jost({
  variable: "--fonte-jost",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
});

/* Space Grotesk carrega desenho: terminais cortados, g de um andar, largura
   levemente condensada. Registro de estúdio técnico, não de admin genérico. */
const grotesk = Space_Grotesk({
  variable: "--fonte-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* Mono só onde é dado medido: valor, prazo, contagem, código. */
const plexMono = IBM_Plex_Mono({
  variable: "--fonte-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MOD Arquitetura",
  description: "Sistema interno — comercial e produção.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body
        className={`${jost.variable} ${grotesk.variable} ${plexMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
