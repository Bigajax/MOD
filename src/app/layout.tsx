import type { Metadata } from "next";
import { Questrial, Poppins } from "next/font/google";
import { scriptTema } from "@/components/troca-tema";
import "./globals.css";

/* As fontes do manual — Kiona e Champagne & Limousines — não existem no
   Google Fonts. Estes são os pares livres mais próximos:

   Questrial faz o papel do Kiona: caixa-alta geométrica de traço fino,
   a cara dos títulos e rótulos do manual. */
const kiona = Questrial({
  variable: "--fonte-titulo",
  subsets: ["latin"],
  weight: "400",
});

/* Poppins faz o papel do Champagne & Limousines nos textos corridos:
   mesma geometria redonda, com os pesos que o C&L tem (regular e bold). */
const champagne = Poppins({
  variable: "--fonte-texto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
      <body className={`${kiona.variable} ${champagne.variable}`}>
        {children}
      </body>
    </html>
  );
}
