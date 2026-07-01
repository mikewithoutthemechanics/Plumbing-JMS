-- ===========================
-- 1. Enable required extensions
-- ===========================
create extension if not exists "uuid-ossp";

-- ===========================
-- 2. Profiles (extends auth.users)
-- ===========================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('owner', 'technician', 'accountant')),
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===========================
-- 3. Customers
-- ===========================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===========================
-- 4. Materials catalog
-- =========================================
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  unit text not null default 'each',
  admin_unit_price numeric(10, 2) not null default 0,
  quantity_on_hand numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===========================
-- 5. Job cards
-- ===========================
create table if not exists public.job_cards (
  id uuid primary key default gen_random_uuid(),
  job_number text unique not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','assigned','in_progress','completed','invoiced')),
  description text not null,
  admin_hourly_rate numeric(10, 2) not null default 0,
  labour_cost numeric(10, 2) not null default 0,
  materials_cost numeric(10, 2) not null default 0,
  subtotal numeric(10, 2) not null default 0,
  vat_amount numeric(10, 2) not null default 0,
  grand_total numeric(10, 2) not null default 0,
  admin_notes text,
  technician_notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  completed_at timestamptz,
  invoiced_at timestamptz
);

-- ===========================
-- 6. Job materials
-- ===========================
create table if not exists public.job_materials (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  custom_name text,
  quantity numeric(10, 2) not null default 1,
  admin_unit_price numeric(10, 2) not null default 0,
  line_total numeric(10, 2) not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===========================
-- 7. Time logs
-- ===========================
create table if not exists public.time_logs (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  hours numeric(5, 2) not null default 0,
  is_paused boolean not null default false,
  paused_at timestamptz,
  resumed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===========================
-- 8. Banking details
-- ===========================
create table if not exists public.banking_details (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  branch_code text not null,
  swift_code text,
  reference_prefix text not null default 'PLB',
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===========================
-- 9. Audit log
-- ===========================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz default now() not null,
  ip_address text
);

-- ===========================
-- 10. Sync queue
-- ===========================
create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  payload jsonb not null,
  timestamp timestamptz default now() not null,
  retries integer not null default 0,
  status text not null default 'pending' check (status in ('pending','syncing','failed'))
);

-- ===========================
-- 11. Row Level Security (enable on all tables)
-- ===========================
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.materials enable row level security;
alter table public.job_cards enable row level security;
alter table public.job_materials enable row level security;
alter table public.time_logs enable row level security;
alter table public.banking_details enable row level security;
alter table public.audit_log enable row level security;
alter table public.sync_queue enable row level security;

-- ===========================
-- 12. RLS Policies – SELECT (all roles)
-- ===========================
create policy "Owner select profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician select own profile" on public.profiles for select using (
  id = auth.uid()
);
create policy "Owner select customers" on public.customers for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select customers" on public.customers for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','accountant'))
);
create policy "Owner select materials" on public.materials for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician select materials" on public.materials for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'technician')
);
create policy "Accountant select materials" on public.materials for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','accountant'))
);
create policy "Owner select job_cards" on public.job_cards for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician select own jobs" on public.job_cards for select using (
  assigned_to = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'technician')
);
create policy "Accountant select completed jobs" on public.job_cards for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
  and status in ('completed','invoiced')
);
create policy "Owner select job_materials" on public.job_materials for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician select job_materials" on public.job_materials for select using (
  exists (
    select 1 from public.job_cards jc
    where jc.id = job_card_id and jc.assigned_to = auth.uid()
  )
);
create policy "Owner select time_logs" on public.time_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Technician select time_logs" on public.time_logs for select using (
  technician_id = auth.uid()
);
create policy "Owner select banking_details" on public.banking_details for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select banking_details" on public.banking_details for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','accountant'))
);
create policy "Owner select audit_log" on public.audit_log for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select audit_log" on public.audit_log for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','accountant'))
);
create policy "Owner select sync_queue" on public.sync_queue for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);

-- ===========================
-- 13. RLS Policies – INSERT/UPDATE/DELETE (WITH CHECK only, no USING)
-- ===========================
create policy "Owner insert customers" on public.customers for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner update customers" on public.customers for update with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner delete customers" on public.customers for delete using (true);
create policy "Owner insert materials" on public.materials for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner update materials" on public.materials for update with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner delete materials" on public.materials for delete using (true);
create policy "Owner insert job_cards" on public.job_cards for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner update job_cards" on public.job_cards for update with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner delete job_cards" on public.job_cards for delete using (true);
create policy "Technician update own jobs" on public.job_cards for update using (
  assigned_to = auth.uid() and status in ('assigned','in_progress','completed')
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'technician')
);
create policy "Owner insert job_materials" on public.job_materials for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner update job_materials" on public.job_materials for update with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner delete job_materials" on public.job_materials for delete using (true);
create policy "Technician insert job_materials" on public.job_materials for insert using (
  exists (
    select 1 from public.job_cards jc
    join public.profiles p on p.id = auth.uid()
    where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
  )
);
create policy "Owner insert time_logs" on public.time_logs for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner update time_logs" on public.time_logs for update with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner delete time_logs" on public.time_logs for delete using (true);
create policy "Technician insert time_logs" on public.time_logs for insert with check (
  technician_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'technician')
);
create policy "Owner insert banking_details" on public.banking_details for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner update banking_details" on public.banking_details for update with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner delete banking_details" on public.banking_details for delete using (true);
create policy "Owner insert audit_log" on public.audit_log for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner insert sync_queue" on public.sync_queue for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Owner update sync_queue" on public.sync_queue for update using (true);
create policy "Owner delete sync_queue" on public.sync_queue for delete using (true);

-- ===========================
-- 14. Performance indexes
-- ===========================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_job_cards_customer on public.job_cards(customer_id);
create index if not exists idx_job_cards_assigned on public.job_cards(assigned_to);
create index if not exists idx_job_cards_status on public.job_cards(status);
create index if not exists idx_job_materials_job on public.job_materials(job_card_id);
create index if not exists idx_job_materials_material on public.job_materials(material_id);
create index if not exists idx_time_logs_job on public.time_logs(job_card_id);
create index if not exists idx_time_logs_tech on public.time_logs(technician_id);
create index if not exists idx_materials_active on public.materials(is_active);
create index if not exists idx_queue_status_ts on public.sync_queue(status, "timestamp");
create index if not exists idx_audit_log_table_record on public.audit_log(table_name, record_id);
create index if not exists idx_audit_log_changed_at on public.audit_log(changed_at desc);

-- ===========================
-- 15. Disable triggers on audit_log to prevent accidental modification
-- ===========================
alter table public.audit_log disable trigger all;

-- ===========================
-- 16. Updated_at triggers
-- ===========================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.customers for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.materials for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.job_cards for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.job_materials for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.time_logs for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.banking_details for each row execute function public.handle_updated_at();

-- ===========================
-- 17. Insert the test owner profile (id matches the auth user we created)
-- ===========================
insert into public.profiles (
  id,
  role,
  full_name,
  email,
  created_at,
  updated_at
) values (
  'ab8f1ae0-0a90-4f25-ab34-10dfd8aaf675',   -- auth user ID from earlier step
  'owner',
  'Test Owner',
  'test@agentcy.co.za',
  now(),
  now()
)
on conflict (id) do update set
  role = excluded.role,
  full_name = excluded.full_name,
  email = excluded.email,
  updated_at = now();