-- =====================================================================
-- Sistema MOD Arquitetura — migration inicial
-- Roda limpa em banco novo. Cole inteiro no SQL Editor do Supabase.
-- =====================================================================

-- ============ EXTENSÕES ============
create extension if not exists "pgcrypto";

-- ============ ORG & PERFIS ============
create table orgs (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  created_at  timestamptz not null default now()
);

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  nome        text not null,
  created_at  timestamptz not null default now()
);

-- Helper usado por TODAS as policies de RLS
create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- ============ ENUMS ============
create type origem_lead     as enum ('indicacao','instagram','acim','casacor','site','outro');
create type tipo_pessoa      as enum ('pf','pj');
create type tipo_projeto     as enum ('residencial','corporativo','retrofit','interiores','outro');
create type etapa_comercial  as enum ('lead','contato','reuniao','briefing','proposta','negociacao','ganho','perdido');
create type status_etapa     as enum ('nao_iniciada','em_andamento','aguardando_aprovacao','aprovada','concluida');
create type status_projeto   as enum ('ativo','pausado','concluido','cancelado');
create type status_parcela   as enum ('prevista','faturada','paga','cancelada');

-- ============ CLIENTES ============
create table clientes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  nome          text not null,
  tipo_pessoa   tipo_pessoa not null default 'pf',
  telefone      text,
  email         text,
  origem        origem_lead not null default 'outro',
  observacoes   text,
  created_at    timestamptz not null default now()
);

-- ============ FUNIL COMERCIAL ============
create table oportunidades (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references orgs(id) on delete cascade,
  cliente_id       uuid not null references clientes(id) on delete cascade,
  titulo           text not null,
  tipo_projeto     tipo_projeto not null default 'residencial',
  area_m2          numeric(10,2),
  valor_proposta   numeric(12,2),
  etapa            etapa_comercial not null default 'lead',
  ultimo_contato   date not null default current_date,
  proximo_followup date,
  motivo_perda     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============ PROJETOS ============
create table projetos (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references orgs(id) on delete cascade,
  cliente_id       uuid not null references clientes(id) on delete cascade,
  oportunidade_id  uuid references oportunidades(id) on delete set null,
  nome             text not null,
  tipo_projeto     tipo_projeto not null,
  area_m2          numeric(10,2),
  valor_contrato   numeric(12,2) not null default 0,
  data_inicio      date not null default current_date,
  prazo_final      date,
  status           status_projeto not null default 'ativo',
  link_drive       text,
  created_at       timestamptz not null default now()
);

-- ============ ETAPAS ============
create table etapas (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  projeto_id      uuid not null references projetos(id) on delete cascade,
  nome            text not null,
  ordem           int  not null default 0,
  responsavel_id  uuid references profiles(id) on delete set null,
  prazo           date,
  status          status_etapa not null default 'nao_iniciada',
  data_entrega    date,   -- preenchida ao entrar em 'aguardando_aprovacao'
  data_aprovacao  date,   -- preenchida ao entrar em 'aprovada'
  observacoes     text,
  created_at      timestamptz not null default now()
);

-- ============ TAREFAS ============
create table tarefas (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  etapa_id        uuid not null references etapas(id) on delete cascade,
  titulo          text not null,
  responsavel_id  uuid references profiles(id) on delete set null,
  prazo           date,
  concluida       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============ FINANCEIRO ============
create table parcelas (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  projeto_id     uuid not null references projetos(id) on delete cascade,
  etapa_id       uuid references etapas(id) on delete set null,
  descricao      text not null,
  valor          numeric(12,2) not null default 0,
  vencimento     date,
  status         status_parcela not null default 'prevista',
  data_pagamento date,
  created_at     timestamptz not null default now()
);

-- ============ TEMPLATES DE ETAPA ============
create table etapa_templates (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  tipo_projeto        tipo_projeto not null,
  nome                text not null,
  ordem               int not null default 0,
  parcela_percentual  numeric(5,2) not null default 0,
  dias_estimados      int not null default 15
);

-- ============ ÍNDICES ============
create index idx_clientes_org        on clientes(org_id);
create index idx_oport_org_etapa     on oportunidades(org_id, etapa);
create index idx_oport_followup      on oportunidades(org_id, proximo_followup);
create index idx_projetos_org_status on projetos(org_id, status);
create index idx_etapas_projeto      on etapas(projeto_id, ordem);
create index idx_etapas_org_prazo    on etapas(org_id, prazo);
create index idx_tarefas_etapa       on tarefas(etapa_id);
create index idx_parcelas_org_venc   on parcelas(org_id, vencimento);
create index idx_parcelas_projeto    on parcelas(projeto_id);
create index idx_templates_org_tipo  on etapa_templates(org_id, tipo_projeto, ordem);

-- ============ RLS ============
-- Mesmo padrão para todas: só enxerga/edita a própria org.
alter table clientes        enable row level security;
alter table oportunidades   enable row level security;
alter table projetos        enable row level security;
alter table etapas          enable row level security;
alter table tarefas         enable row level security;
alter table parcelas        enable row level security;
alter table etapa_templates enable row level security;
alter table profiles        enable row level security;

create policy org_all on clientes        for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_all on oportunidades   for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_all on projetos        for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_all on etapas          for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_all on tarefas         for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_all on parcelas        for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_all on etapa_templates for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy own_profile on profiles    for select using (org_id = current_org_id());

-- ============ TRIGGER updated_at ============
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_oport_updated
  before update on oportunidades
  for each row execute function set_updated_at();

-- =====================================================================
-- ORG ÚNICA + SEED DOS TEMPLATES
-- UUID fixo para a migration rodar sem substituição manual.
-- =====================================================================

insert into orgs (id, nome)
values ('11111111-1111-1111-1111-111111111111', 'MOD Arquitetura');

insert into etapa_templates (org_id, tipo_projeto, nome, ordem, parcela_percentual, dias_estimados) values
('11111111-1111-1111-1111-111111111111','residencial','Levantamento e medição',        1, 20, 7),
('11111111-1111-1111-1111-111111111111','residencial','Estudo preliminar',             2, 20, 15),
('11111111-1111-1111-1111-111111111111','residencial','Anteprojeto',                   3, 20, 20),
('11111111-1111-1111-1111-111111111111','residencial','Projeto executivo',             4, 20, 30),
('11111111-1111-1111-1111-111111111111','residencial','Detalhamento e marcenaria',     5, 10, 20),
('11111111-1111-1111-1111-111111111111','residencial','Acompanhamento de obra',        6, 10, 60),

('11111111-1111-1111-1111-111111111111','corporativo','Levantamento e briefing',       1, 20, 7),
('11111111-1111-1111-1111-111111111111','corporativo','Estudo preliminar',             2, 20, 15),
('11111111-1111-1111-1111-111111111111','corporativo','Anteprojeto',                   3, 15, 20),
('11111111-1111-1111-1111-111111111111','corporativo','Projeto executivo',             4, 25, 30),
('11111111-1111-1111-1111-111111111111','corporativo','Complementares',                5, 10, 20),
('11111111-1111-1111-1111-111111111111','corporativo','Acompanhamento de obra',        6, 10, 60),

('11111111-1111-1111-1111-111111111111','interiores','Levantamento e medição',         1, 25, 7),
('11111111-1111-1111-1111-111111111111','interiores','Estudo preliminar',              2, 25, 15),
('11111111-1111-1111-1111-111111111111','interiores','Projeto executivo',              3, 30, 25),
('11111111-1111-1111-1111-111111111111','interiores','Detalhamento e marcenaria',      4, 20, 20);

-- Retrofit e "outro" reaproveitam a trilha residencial.
insert into etapa_templates (org_id, tipo_projeto, nome, ordem, parcela_percentual, dias_estimados)
select org_id, 'retrofit'::tipo_projeto, nome, ordem, parcela_percentual, dias_estimados
from etapa_templates where tipo_projeto = 'residencial';

insert into etapa_templates (org_id, tipo_projeto, nome, ordem, parcela_percentual, dias_estimados)
select org_id, 'outro'::tipo_projeto, nome, ordem, parcela_percentual, dias_estimados
from etapa_templates where tipo_projeto = 'residencial';

-- =====================================================================
-- PERFIL AUTOMÁTICO
-- Os 2 sócios são criados à mão no painel do Supabase. Sem este trigger
-- eles ficariam sem org_id, current_org_id() devolveria null e a RLS
-- bloquearia tudo — o login pareceria quebrado.
-- =====================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, org_id, nome)
  values (
    new.id,
    '11111111-1111-1111-1111-111111111111',
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- R1 — CONVERSÃO DE OPORTUNIDADE EM PROJETO (uma transação)
-- Cria projeto + etapas do template + parcelas por etapa de uma vez.
-- security invoker: roda como o usuário logado, então a RLS continua valendo.
-- =====================================================================

create or replace function converter_oportunidade(
  p_oportunidade_id uuid,
  p_nome            text,
  p_tipo_projeto    tipo_projeto,
  p_valor_contrato  numeric,
  p_data_inicio     date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org        uuid;
  v_cliente    uuid;
  v_area       numeric;
  v_projeto    uuid;
  v_dias_acc   int := 0;
  v_prazo      date;
  v_etapa_id   uuid;
  v_prazo_final date;
  t            record;
begin
  select org_id, cliente_id, area_m2
    into v_org, v_cliente, v_area
  from oportunidades
  where id = p_oportunidade_id;

  if v_org is null then
    raise exception 'Oportunidade não encontrada ou fora da sua organização';
  end if;

  insert into projetos (org_id, cliente_id, oportunidade_id, nome, tipo_projeto,
                        area_m2, valor_contrato, data_inicio, status)
  values (v_org, v_cliente, p_oportunidade_id, p_nome, p_tipo_projeto,
          v_area, p_valor_contrato, p_data_inicio, 'ativo')
  returning id into v_projeto;

  for t in
    select nome, ordem, parcela_percentual, dias_estimados
    from etapa_templates
    where org_id = v_org and tipo_projeto = p_tipo_projeto
    order by ordem
  loop
    v_dias_acc := v_dias_acc + t.dias_estimados;
    v_prazo := p_data_inicio + v_dias_acc;

    insert into etapas (org_id, projeto_id, nome, ordem, prazo, status)
    values (v_org, v_projeto, t.nome, t.ordem, v_prazo, 'nao_iniciada')
    returning id into v_etapa_id;

    if t.parcela_percentual > 0 then
      insert into parcelas (org_id, projeto_id, etapa_id, descricao, valor, vencimento, status)
      values (
        v_org, v_projeto, v_etapa_id,
        t.nome,
        round(p_valor_contrato * t.parcela_percentual / 100, 2),
        v_prazo,
        'prevista'
      );
    end if;
  end loop;

  v_prazo_final := p_data_inicio + v_dias_acc;
  update projetos set prazo_final = v_prazo_final where id = v_projeto;

  update oportunidades
     set etapa = 'ganho', ultimo_contato = current_date
   where id = p_oportunidade_id;

  return v_projeto;
end;
$$;
