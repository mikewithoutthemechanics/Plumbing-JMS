create or replace function public.log_quote_enquiry()
returns trigger as $$
begin
  begin
    insert into public.sync_queue (table_name, operation, payload)
    values (
      'quotes',
      'INSERT',
      jsonb_build_object(
        'id', new.id,
        'customer_name', coalesce(new.customer_name, ''),
        'customer_email', coalesce(new.customer_email, ''),
        'customer_phone', coalesce(new.customer_phone, ''),
        'description', new.description,
        'created_at', new.created_at
      )
    );
  exception
    when others then
      null;
  end;
  return new;
end;
$$ language plpgsql;

drop trigger if exists quote_enquiry_trigger on public.quotes;
create trigger quote_enquiry_trigger
after insert on public.quotes
for each row execute function public.log_quote_enquiry();
