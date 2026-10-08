-- One payment, one Printful order.
--
-- orders.stripe_session_id is already unique, so a payment has one ledger
-- row however many times Stripe delivers the webhook. This adds the second
-- half: only one worker at a time may send that row to Printful. A worker
-- claims the row by moving it to 'sending'; a concurrent delivery or the
-- house sweep finds it claimed and leaves it alone. A claim older than
-- ten minutes belongs to a worker that died, and may be taken over; the new
-- worker first asks Printful for an order with this payment's external id,
-- so a worker that died after Printful accepted the order cannot cause a
-- second one.

alter table public.orders add column if not exists printful_claimed_at timestamptz;

alter table public.orders drop constraint if exists orders_printful_status_check;
alter table public.orders add constraint orders_printful_status_check
  check (printful_status in ('none', 'pending', 'sending', 'created', 'failed'));

create unique index if not exists orders_payment_intent_key
  on public.orders (payment_intent) where payment_intent is not null;

create or replace function public.claim_printful_order(p_id uuid)
returns boolean
language sql
as $$
  with claimed as (
    update public.orders
       set printful_status = 'sending',
           printful_claimed_at = now(),
           updated_at = now()
     where id = p_id
       and (printful_status in ('pending', 'failed')
            or (printful_status = 'sending' and printful_claimed_at < now() - interval '10 minutes'))
    returning id
  )
  select exists (select 1 from claimed);
$$;

-- Only the Edge Functions (service role) may claim.
revoke all on function public.claim_printful_order(uuid) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.claim_printful_order(uuid) from anon, authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.claim_printful_order(uuid) to service_role;
  end if;
end $$;
