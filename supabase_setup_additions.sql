-- ============================================================
-- Plumbing JMS — Feature additions migration
-- Run this AFTER supabase_setup.sql in the Supabase SQL editor.
-- Adds: material categories (maintenance vs job-site), tender
-- files on job cards, bought/claimed material columns, debtor
-- payments, client signatures, and OpenWA WhatsApp config.
-- ============================================================

-- ===========================================================
-- 1. Material categories (stock kept in car vs stock bought
--    for a specific job)
-- ===========================================================
alter table public.materials
  add column if not exists category text not null default 'maintenance'
    check (category in ('maintenance', 'job_site'));

alter table public.materials
  add column if not exists reorder_level numeric(10, 2) not null default 0;

create index if not exists idx_materials_category on public.materials(category);

-- ===========================================================
-- 2. Tender files uploaded against a job card
-- ===========================================================
create table if not exists public.job_tenders (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_job_tenders_job on public.job_tenders(job_card_id);

-- ===========================================================
-- 3. Extend job_materials with bought / claimed tracking
-- ===========================================================
alter table public.job_materials
  add column if not exists bought boolean not null default false;

alter table public.job_materials
  add column if not exists claimed boolean not null default false;

alter table public.job_materials
  add column if not exists bought_at timestamptz;
alter table public.job_materials
  add column if not exists claimed_at timestamptz;

-- ===========================================================
-- 4. Job status: migrate 'in_progress' to 'completed', add 'to_be_invoiced'
-- ===========================================================
update public.job_cards
  set status = 'completed'
  where status = 'in_progress';

alter table public.job_cards drop constraint if exists job_cards_status_check;
alter table public.job_cards
  add constraint job_cards_status_check
  check (status in ('pending', 'assigned', 'completed', 'to_be_invoiced', 'invoiced'));

-- ===========================================================
-- 5. Invoices / debtors
-- ===========================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_number text unique not null,
  amount_due numeric(12, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partial', 'paid', 'overdue')),
  due_date date,
  issued_at timestamptz default now() not null,
  paid_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount numeric(12, 2) not null default 0,
  method text not null default 'cash'
    check (method in ('cash', 'card', 'eft', 'other')),
  recorded_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz default now() not null
);

create index if not exists idx_invoices_customer on public.invoices(customer_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_payments_customer on public.payments(customer_id);

-- ===========================================================
-- 6. Client signature captured on the job card
-- ===========================================================
create table if not exists public.job_signatures (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  signatory_name text,
  signature_data text not null, -- data URL (PNG)
  created_at timestamptz default now() not null
);

create index if not exists idx_job_signatures_job on public.job_signatures(job_card_id);

-- ===========================================================
-- 7. OpenWA WhatsApp automation config
-- ===========================================================
create table if not exists public.whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  base_url text not null,
  session_name text not null default 'main',
  enabled boolean not null default false,
  reminder_template text not null default
    'Hi {{customer_name}}, your invoice {{invoice_number}} for {{amount_due}} is outstanding. Please make payment to avoid late fees.',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  to_number text not null,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  error text,
  created_at timestamptz default now() not null
);

-- ===========================================================
-- 8. RLS — enable on new tables
-- ===========================================================
alter table public.job_tenders enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.job_signatures enable row level security;
alter table public.whatsapp_config enable row level security;
alter table public.whatsapp_messages enable row level security;

-- SELECT policies
create policy "Owner select job_tenders" on public.job_tenders for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician select job_tenders" on public.job_tenders for select using (
  exists (
    select 1 from public.job_cards jc
    join public.profiles p on p.id = auth.uid()
    where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
  )
);
create policy "Accountant select job_tenders" on public.job_tenders for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);

create policy "Owner select invoices" on public.invoices for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select invoices" on public.invoices for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);

create policy "Owner select payments" on public.payments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select payments" on public.payments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);

create policy "Owner select job_signatures" on public.job_signatures for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician select job_signatures" on public.job_signatures for select using (
  exists (
    select 1 from public.job_cards jc
    where jc.id = job_card_id and jc.assigned_to = auth.uid()
  )
);

create policy "Owner select whatsapp_config" on public.whatsapp_config for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner select whatsapp_messages" on public.whatsapp_messages for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select whatsapp_messages" on public.whatsapp_messages for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);

-- Owner-only write on new tables
create policy "Owner write job_tenders" on public.job_tenders for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician write job_tenders" on public.job_tenders for insert with check (
  exists (
    select 1 from public.job_cards jc
    join public.profiles p on p.id = auth.uid()
    where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
  )
);

create policy "Owner write invoices" on public.invoices for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant write invoices" on public.invoices for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);

create policy "Owner write payments" on public.payments for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant write payments" on public.payments for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);

create policy "Owner write job_signatures" on public.job_signatures for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician write job_signatures" on public.job_signatures for insert with check (
  exists (
    select 1 from public.job_cards jc
    join public.profiles p on p.id = auth.uid()
    where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
  )
);

create policy "Owner write whatsapp_config" on public.whatsapp_config for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner write whatsapp_messages" on public.whatsapp_messages for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant write whatsapp_messages" on public.whatsapp_messages for all with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);

-- ===========================================================
-- 9. updated_at trigger for new tables
-- ===========================================================
create trigger set_updated_at before update on public.invoices
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.whatsapp_config
  for each row execute function public.handle_updated_at();

-- ===========================================================
-- 10. Storage bucket for tender files
-- ===========================================================
insert into storage.buckets (id, name, public)
values ('tenders', 'tenders', false)
on conflict (id) do nothing;

create policy "Owner tender storage" on storage.objects for all
  using (bucket_id = 'tenders' and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'))
  with check (bucket_id = 'tenders' and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));
create policy "Technician tender storage" on storage.objects for insert
  with check (bucket_id = 'tenders' and exists (select 1 from public.profiles where id = auth.uid() and role = 'technician'));
create policy "Technician read tender storage" on storage.objects for select
  using (bucket_id = 'tenders' and exists (select 1 from public.profiles where id = auth.uid() and role = 'technician'));

-- ===========================================================
-- 11. Helper view: debtors outstanding
-- ===========================================================
create or replace view public.debtors_view as
select
  c.id as customer_id,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  coalesce(sum(i.amount_due - i.amount_paid), 0) as outstanding,
  count(i.id) filter (where i.status in ('unpaid', 'partial', 'overdue')) as open_invoices
from public.customers c
left join public.invoices i on i.customer_id = c.id
group by c.id, c.name, c.email, c.phone;
