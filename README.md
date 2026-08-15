# MOD

Sistema interno da **MOD Arquitetura** (Maringá/PR). Dois usuários — os dois sócios. Não é SaaS:
não tem cadastro público, nem onboarding, nem portal de cliente.

Cobre dois fluxos que se encontram na assinatura do contrato:

- **Comercial** — prospecção até fechamento
- **Produção** — contrato até entrega, com o financeiro amarrado por etapa

Escritório de arquitetura cobra por medição: entregou o anteprojeto, libera a parcela. O sistema
amarra isso, senão vira quadro bonito e ninguém cobra.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres + Auth + RLS) · deploy Vercel.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha as chaves do painel do Supabase
npm run dev
```

Aplique `supabase/migrations/0001_init.sql` no SQL Editor do Supabase. Ela cria as tabelas, a RLS,
os templates de etapa e a função `converter_oportunidade`. Os usuários são criados à mão no painel
de Auth — um trigger cria o perfil e amarra na org.

## Telas

| Rota | O que é |
|---|---|
| `/hoje` | Follow-ups parados, etapas da semana e parcelas vencendo |
| `/comercial` | Funil em kanban, com conversão em projeto e motivo de perda |
| `/projetos` | Quadro por etapa em curso |
| `/projetos/[id]` | Cronograma cotado, etapas, tarefas e financeiro |
| `/clientes` | Cadastro com busca |

## Regras que o sistema garante

- Mover uma oportunidade para **Ganho** cria projeto, etapas e parcelas em **uma transação**
  (RPC `converter_oportunidade`), com as parcelas somando exatamente o valor do contrato.
- Mover para **Perdido** exige motivo.
- Etapa em `aguardando_aprovacao` grava a data de entrega e oferece faturar a parcela vinculada.
- Parcela atrasada é **derivada** do vencimento, nunca gravada como status.
- Toda movimentação no funil atualiza o último contato; 7 dias avisam, 14 alarmam.

## Design

A interface é uma **prancha**: moldura impressa, carimbo na margem inferior com o dado vivo da tela,
e as seções como abas de folha. Status não é paleta, é escala de tinta — quanto mais adiantado, mais
escuro — com um único acento para atraso. A direção vem da identidade real do escritório.
