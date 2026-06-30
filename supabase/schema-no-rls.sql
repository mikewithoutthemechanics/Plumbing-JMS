-- Quick Setup - RLS Disabled (backend uses service_role key)
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('owner', 'technician', 'accountant')),
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

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

create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  payload jsonb not null,
  timestamp timestamptz default now() not null,
  retries integer not null default 0,
  status text not null default 'pending' check (status in ('pending','syncing','failed'))
);

-- Business Enhancements

-- Service catalog (pre-defined job types with pricing)
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_hourly_rate numeric(10, 2) not null default 0,
  default_materials jsonb,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Staff availability schedule
create table if not exists public.staff_schedule (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  status text not null check (status in ('available', 'busy', 'off', 'vacation')),
  notes text,
  created_at timestamptz default now() not null,
  unique(profile_id, date)
);

-- Customer communications log
create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.job_cards(id) on delete set null,
  type text not null check (type in ('call', 'email', 'sms', 'whatsapp')),
  direction text not null check (direction in ('inbound', 'outbound')),
  summary text not null,
  timestamp timestamptz default now() not null,
  recorded_by uuid references public.profiles(id) on delete set null
);

-- Invoices (separate from job_cards for accounting)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete restrict,
  invoice_number text unique not null,
  amount_due numeric(10, 2) not null,
  vat_amount numeric(10, 2) not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'paid', 'overdue')),
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Quote requests from customers
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'quoted', 'accepted', 'rejected')),
  estimated_price numeric(10, 2),
  created_at timestamptz default now() not null
);

-- Performance indexes
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_job_cards_customer on public.job_cards(customer_id);
create index if not exists idx_job_cards_assigned on public.job_cards(assigned_to);
create index if not exists idx_job_cards_status on public.job_cards(status);
create index if not exists idx_job_materials_job on public.job_materials(job_card_id);
create index if not exists idx_job_materials_material on public.job_materials(material_id);
create index if not exists idx_time_logs_job on public.time_logs(job_card_id);
create index if not exists idx_time_logs_tech on public.time_logs(technician_id);
create index if not exists idx_materials_active on public.materials(is_active);
create index if not exists idx_sync_queue_status_ts on public.sync_queue(status, "timestamp");
create index if not exists idx_services_active on public.services(is_active);
create index if not exists idx_staff_schedule_date on public.staff_schedule(date);
create index if not exists idx_communications_customer on public.communications(customer_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_quotes_status on public.quotes(status);

create trigger set_updated_at before update on public.services for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.invoices for each row execute function public.handle_updated_at();

-- Updated_at triggers
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

-- Add initial test owner profile (after creating auth user)
-- insert into profiles (id, email, full_name, role) values ('dev-admin-001', 'test@agentcy.co.za', 'Dev Admin', 'owner');