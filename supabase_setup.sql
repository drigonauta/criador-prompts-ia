-- 1. Crie a tabela de leads
create table leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  whatsapp text not null unique,
  email text not null,
  usage_count int default 0,
  usage_limit int default 1,
  last_usage_at timestamp with time zone
);

-- 2. Habilite a segurança (RLS)
alter table leads enable row level security;

-- 3. Crie as políticas de acesso (Simples para MVP)
-- PERMITIR que qualquer pessoa se cadastre (Insert)
create policy "Permitir cadastro público" on leads
  for insert with check (true);

-- PERMITIR que o app leia os dados (Select)
create policy "Permitir leitura pública" on leads
  for select using (true);

-- PERMITIR que o app atualize a contagem (Update)
create policy "Permitir atualização pública" on leads
  for update using (true);
