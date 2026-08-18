-- =====================================================================
-- KISS — Gerador de estudo preliminar
-- Estudo = lote + programa. Variante = uma planta gerada por seed.
-- Cole inteiro no SQL Editor do Supabase, depois da 0001.
-- =====================================================================

create table estudos (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  cliente_id  uuid references clientes(id) on delete set null,
  lote        jsonb not null,
  programa    jsonb not null,
  created_at  timestamptz not null default now()
);

create table variantes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  estudo_id   uuid not null references estudos(id) on delete cascade,
  seed             int not null,
  comodos          jsonb not null,
  portas           jsonb not null default '[]'::jsonb,
  patio            jsonb,
  area_construida  numeric(8,1) not null default 0,
  score            numeric(5,1) not null default 0,
  favorita         boolean not null default false
);

create index idx_estudos_org      on estudos(org_id, created_at desc);
create index idx_variantes_estudo on variantes(estudo_id, score desc);

alter table estudos   enable row level security;
alter table variantes enable row level security;

create policy org_all on estudos   for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_all on variantes for all using (org_id = current_org_id()) with check (org_id = current_org_id());
