-- Function to log job assignment for notification processing
create or replace function public.log_job_assignment()
returns trigger as $$
begin
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    begin
      insert into public.sync_queue (table_name, operation, payload)
      values (
        'job_cards',
        'UPDATE',
        jsonb_build_object(
          'id', new.id,
          'job_number', new.job_number,
          'assigned_to', new.assigned_to,
          'customer_id', new.customer_id,
          'status', new.status
        )
      );
    exception
      when others then
        null;
    end;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists job_assigned_trigger on public.job_cards;
create trigger job_assigned_trigger
after update on public.job_cards
for each row execute function public.log_job_assignment();
