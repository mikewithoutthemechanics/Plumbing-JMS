-- Follow-up to 20260820170000_harden_rls.sql: the live project has NO
-- public.invoices / public.payments tables, so the deferred record_payment RPC
-- (finding #11) could not be created. The API already depends on these
-- (src/app/api/invoices/route.ts, src/app/api/debtors/route.ts,
--  src/app/api/whatsapp/route.ts, src/app/(dashboard)/accountant/debtors/page.tsx).
-- This migration creates the missing tables + view + RPC, matching the API column
-- contract (validated against src/app/api/invoices/route.ts, src/lib/validation.ts)
-- and the reference DDL in supabase_setup_additions.sql.

-- ============================================================
-- 1. public.invoices
-- ============================================================
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

-- ============================================================
-- 2. public.payments
-- NOTE: method check is a SUPERSET of the reference DDL
-- ('cash','card','eft','other') so the app's z.enum values
-- ['cash','card','bank_transfer','check','other']
-- (src/lib/validation.ts paymentInputSchema.method) never fail.
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount numeric(12, 2) not null default 0,
  method text not null default 'cash'
    check (method in ('cash', 'card', 'bank_transfer', 'check', 'eft', 'other')),
  recorded_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- 3. Indexes
-- ============================================================
create index if not exists idx_invoices_customer on public.invoices(customer_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_payments_customer on public.payments(customer_id);

-- ============================================================
-- 4. updated_at trigger (handle_updated_at defined in 20260820160200)
-- ============================================================
create trigger set_updated_at before update on public.invoices
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

-- ============================================================
-- 6. RLS policies (owner/accountant only; technician never sees invoices).
-- FOR ALL policies carry BOTH using + with check so SELECT/INSERT/UPDATE/DELETE
-- all work for owner/accountant (a FOR ALL policy with only WITH CHECK would
-- cover INSERT/UPDATE only; DELETE would be silently blocked).
-- ============================================================
-- invoices
create policy "Owner select invoices" on public.invoices for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select invoices" on public.invoices for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);
create policy "Owner write invoices" on public.invoices for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
create policy "Accountant write invoices" on public.invoices for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
  );

-- payments
create policy "Owner select payments" on public.payments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);
create policy "Accountant select payments" on public.payments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
);
create policy "Owner write payments" on public.payments for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
create policy "Accountant write payments" on public.payments for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
  );

-- ============================================================
-- 7. debtors_view (security_invoker so RLS on customers/invoices is enforced
-- for the server client which will run on the anon key in a later step).
-- ============================================================
create or replace view public.debtors_view
with (security_invoker = true) as
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

-- ============================================================
-- 8. Grants (required so the anon-key server client running as the
-- 'authenticated' role has permission on the new objects).
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select on public.debtors_view to authenticated;

-- ============================================================
-- 9. public.record_payment RPC (finding #11): atomic replacement for the
-- read-modify-write in api/invoices PATCH. SECURITY INVOKER, pinned
-- search_path, input validated up front.
-- ============================================================
create or replace function public.record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_note text,
  p_user_id uuid
)
returns setof public.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invoice public.invoices%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be positive' using errcode = 'P0002';
  end if;
  if p_method is null or p_method not in ('cash', 'card', 'bank_transfer', 'check', 'eft', 'other') then
    raise exception 'Invalid payment method' using errcode = 'P0002';
  end if;

  update public.invoices
    set amount_paid = amount_paid + p_amount,
        status = case
          when amount_paid + p_amount >= amount_due then 'paid'
          when amount_paid + p_amount > 0 then 'partial'
          else 'unpaid'
        end,
        paid_at = case
          when amount_paid + p_amount >= amount_due then now()
          else paid_at
        end
    where id = p_invoice_id
    returning * into v_invoice;
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0002';
  end if;

  insert into public.payments (invoice_id, customer_id, amount, method, note, recorded_by)
  values (v_invoice.id, v_invoice.customer_id, p_amount, p_method, p_note, p_user_id);

  return next v_invoice;
end;
$$;

grant execute on function public.record_payment(uuid, numeric, text, text, uuid) to authenticated;