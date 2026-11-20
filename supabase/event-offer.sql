-- ------------------------------------------------------ promotional events ----
-- Event offers (first: 25% off brokerage for people who register on 21 Nov 2026).
-- Visitors register through public.register_for_event() only, without signing in;
-- the database enforces the registration window and one registration per WhatsApp
-- number. Staff read registrations and the funnel counts in the admin panel.
create table if not exists public.promo_events (
  slug      text primary key check (slug ~ '^[a-z0-9-]+$'),
  title     text not null,
  opens_at  timestamptz not null,
  closes_at timestamptz not null,
  check (closes_at > opens_at)
);
insert into public.promo_events (slug, title, opens_at, closes_at)
values ('nov-21-2026', '21 November 2026 real estate event: 25% off brokerage', '2026-11-21 00:00:00+05:30', '2026-11-21 23:59:59+05:30')
on conflict (slug) do nothing;
alter table public.promo_events enable row level security;
drop policy if exists "anyone reads promo events" on public.promo_events;
create policy "anyone reads promo events" on public.promo_events for select to anon, authenticated using (true);
drop policy if exists "staff manage promo events" on public.promo_events;
create policy "staff manage promo events" on public.promo_events for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
grant select on public.promo_events to anon, authenticated;
grant insert, update, delete on public.promo_events to authenticated;

create sequence if not exists private.event_registration_no;
create table if not exists public.event_registrations (
  id         uuid primary key default gen_random_uuid(),
  event_slug text not null references public.promo_events (slug) on update cascade,
  code       text not null unique,
  name       text not null check (char_length(name) between 2 and 120),
  company    text check (company is null or char_length(company) <= 160),
  -- 91 + a 10-digit Indian mobile number
  whatsapp   text not null check (whatsapp ~ '^91[6-9][0-9]{9}$'),
  source     text not null default 'page' check (source in ('popup', 'page', 'qr')),
  created_at timestamptz not null default now(),
  unique (event_slug, whatsapp)
);
create index if not exists event_registrations_event on public.event_registrations (event_slug, created_at desc);
revoke all on public.event_registrations from anon, authenticated;
grant select, delete on public.event_registrations to authenticated;
alter table public.event_registrations enable row level security;
drop policy if exists "staff read event registrations" on public.event_registrations;
create policy "staff read event registrations" on public.event_registrations for select to authenticated using ((select public.is_staff()));
drop policy if exists "staff delete event registrations" on public.event_registrations;
create policy "staff delete event registrations" on public.event_registrations for delete to authenticated using ((select public.is_staff()));

-- Funnel: offer seen (popup or page), arrived from the QR code, started the form.
create table if not exists public.event_activity (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  event_slug text not null references public.promo_events (slug) on update cascade,
  type       text not null check (type in ('view', 'qr_scan', 'form_start')),
  visitor    uuid not null
);
create index if not exists event_activity_event on public.event_activity (event_slug, type);
create index if not exists event_activity_visitor on public.event_activity (visitor, at);
revoke all on public.event_activity from anon, authenticated;
grant select on public.event_activity to authenticated;
alter table public.event_activity enable row level security;
drop policy if exists "staff read event activity" on public.event_activity;
create policy "staff read event activity" on public.event_activity for select to authenticated using ((select public.is_staff()));

create or replace function public.register_for_event(event text, full_name text, company text, whatsapp text, source text default 'page')
returns text language plpgsql security definer set search_path = '' as $$
declare
  e public.promo_events%rowtype;
  digits text := regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g');
  clean_name text := btrim(regexp_replace(coalesce(full_name, ''), '\s+', ' ', 'g'));
  clean_company text := nullif(btrim(regexp_replace(coalesce(company, ''), '\s+', ' ', 'g')), '');
  new_code text;
begin
  select * into e from public.promo_events where slug = event;
  if not found then raise exception 'This offer is not available.' using errcode = 'P0001'; end if;
  if now() < e.opens_at then
    raise exception 'Registration opens on % IST.', to_char(e.opens_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM') using errcode = 'P0001';
  end if;
  if now() > e.closes_at then raise exception 'This offer has closed.' using errcode = 'P0001'; end if;
  if char_length(digits) = 10 then digits := '91' || digits;
  elsif char_length(digits) = 11 and left(digits, 1) = '0' then digits := '91' || substr(digits, 2);
  end if;
  if digits !~ '^91[6-9][0-9]{9}$' then raise exception 'Please enter a valid 10-digit WhatsApp number.' using errcode = 'P0001'; end if;
  if char_length(clean_name) not between 2 and 120 then raise exception 'Please enter your full name.' using errcode = 'P0001'; end if;
  if char_length(coalesce(clean_company, '')) > 160 then raise exception 'Please shorten the company name.' using errcode = 'P0001'; end if;
  if (select count(*) from public.event_registrations r where r.created_at > now() - interval '10 minutes') >= 300 then
    raise exception 'Too many registrations right now. Please try again in a few minutes.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.event_registrations r where r.event_slug = e.slug and r.whatsapp = digits) then
    raise exception 'This WhatsApp number is already registered for this offer.' using errcode = 'P0001';
  end if;
  new_code := 'ASMS-EV-' || lpad(nextval('private.event_registration_no')::text, 4, '0');
  insert into public.event_registrations (event_slug, code, name, company, whatsapp, source)
  values (e.slug, new_code, clean_name, clean_company, digits, case when source in ('popup', 'page', 'qr') then source else 'page' end);
  return new_code;
exception when unique_violation then
  raise exception 'This WhatsApp number is already registered for this offer.' using errcode = 'P0001';
end $$;

create or replace function public.track_event_activity(event text, activity text, visitor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if activity not in ('view', 'qr_scan', 'form_start') or visitor is null then return; end if;
  if public.is_staff() then return; end if;
  if not exists (select 1 from public.promo_events where slug = event) then return; end if;
  if exists (select 1 from public.event_activity a where a.visitor = track_event_activity.visitor and a.event_slug = event and a.type = activity and a.at > now() - interval '30 minutes') then return; end if;
  if (select count(*) from public.event_activity a where a.visitor = track_event_activity.visitor and a.at > now() - interval '1 day') >= 50 then return; end if;
  insert into public.event_activity (event_slug, type, visitor) values (event, activity, visitor);
end $$;

-- Staff: the funnel for one event, as distinct visitors.
create or replace function public.event_funnel(event text)
returns table (views bigint, qr_scans bigint, form_starts bigint, registrations bigint)
language sql stable security definer set search_path = '' as $$
  select (select count(distinct visitor) from public.event_activity where event_slug = event and type = 'view'),
         (select count(distinct visitor) from public.event_activity where event_slug = event and type = 'qr_scan'),
         (select count(distinct visitor) from public.event_activity where event_slug = event and type = 'form_start'),
         (select count(*) from public.event_registrations where event_slug = event)
   where public.is_staff();
$$;

revoke execute on function public.register_for_event(text, text, text, text, text), public.track_event_activity(text, text, uuid), public.event_funnel(text) from public;
grant execute on function public.register_for_event(text, text, text, text, text), public.track_event_activity(text, text, uuid) to anon, authenticated;
grant execute on function public.event_funnel(text) to authenticated;

