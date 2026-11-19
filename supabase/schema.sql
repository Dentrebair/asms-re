-- ASMS–ROUNAQH content schema for Supabase.
-- Run once in Supabase → SQL Editor. Safe to re-run (idempotent).
-- Security model: anyone may read *published* rows; only emails listed in
-- public.staff may write; only staff with role 'owner' may manage staff.

create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------- staff ----
create table if not exists public.staff (
  email      text primary key check (email = lower(email) and position('@' in email) > 1),
  name       text,
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);

-- Staff are recognised by the signed-in account's *confirmed* email in auth.users,
-- not by the email claim in the token: sign-ups stay open for sellers (Google),
-- so an unconfirmed account that merely claims a staff address must not count.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s join auth.users u on lower(u.email) = s.email
                  where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s join auth.users u on lower(u.email) = s.email
                  where u.id = auth.uid() and u.email_confirmed_at is not null and s.role = 'owner');
$$;

-- Never leave the panel without an owner.
create or replace function private.keep_an_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.staff where role = 'owner') then
    raise exception 'At least one owner must remain';
  end if;
  return null;
end $$;

drop trigger if exists staff_keep_owner on public.staff;
create constraint trigger staff_keep_owner after update or delete on public.staff
  deferrable initially deferred for each row execute function private.keep_an_owner();

-- ----------------------------------------------------------- categories ----
create table if not exists public.product_categories (
  id         text primary key check (id ~ '^[a-z0-9-]+$'),
  name       text not null,
  intro      text not null default '',
  icon       text not null default 'layers',
  sort_order int  not null default 0
);

-- ------------------------------------------------------------- products ----
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category_id  text not null references public.product_categories (id) on update cascade on delete restrict,
  name         text not null,
  summary      text not null default '',
  specs        jsonb not null default '[]' check (jsonb_typeof(specs) = 'array'),
  unit         text not null default '',
  suitable_use text,
  availability text,
  image_path   text,
  image_alt    text,
  published    boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------ seller profiles ----
-- Anyone may list a property (PRD sections 9 to 11). A seller signs in with
-- Google, then completes this profile once; it says who they are. Staff can
-- suspend a seller, which stops new listings and submissions.
create table if not exists public.seller_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null check (email = lower(email)),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  phone       text not null check (phone ~ '^[0-9+() -]{7,20}$'),
  seller_type text not null check (seller_type in ('owner', 'broker', 'developer', 'other')),
  company     text check (company is null or char_length(company) <= 120),
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.is_active_seller() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.seller_profiles where user_id = auth.uid() and status = 'active');
$$;

-- ----------------------------------------------------------- properties ----
create table if not exists public.properties (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  reference        text not null unique,
  title            text not null,
  -- Listing stage (PRD section 11). Visitors see only 'live' (in search) and 'sold' (detail page, marked Sold).
  stage            text not null default 'draft' check (stage in ('draft', 'submitted', 'under_review', 'changes_requested', 'rejected', 'approved', 'live', 'paused', 'sold', 'expired', 'archived')),
  featured         boolean not null default false,
  -- residential | plot | commercial | agricultural; property_type is the subtype shown to buyers.
  category         text not null default 'plot' check (category in ('residential', 'plot', 'commercial', 'agricultural')),
  property_type    text not null default 'Residential plot',
  transaction_type text,
  ownership        text,
  location         text not null default '',
  locality         text,
  price            bigint check (price is null or price > 0),
  price_negotiable boolean,
  -- Area is stored in sq ft; area_unit is how it is shown (with the sq ft conversion on the detail page).
  area_sqft        numeric check (area_sqft is null or area_sqft > 0),
  area_unit        text not null default 'sqft' check (area_unit in ('sqft', 'sqyd', 'cent', 'acre')),
  dimensions       text,
  facing           text,
  -- residential
  bhk              smallint check (bhk is null or bhk between 1 and 20),
  bathrooms        smallint check (bathrooms is null or bathrooms between 0 and 20),
  carpet_area_sqft numeric check (carpet_area_sqft is null or carpet_area_sqft > 0),
  furnishing       text,
  floor_info       text,
  parking          text,
  possession       text check (possession is null or possession in ('Ready to move', 'Under construction')),
  -- plot and land
  road_width_ft    numeric check (road_width_ft is null or road_width_ft > 0),
  frontage_ft      numeric check (frontage_ft is null or frontage_ft > 0),
  land_use         text,
  corner_plot      boolean,
  boundary_wall    boolean,
  gated_layout     boolean,
  floors_allowed   text,
  -- commercial
  usable_area_sqft numeric check (usable_area_sqft is null or usable_area_sqft > 0),
  access_notes     text,
  -- A Google Maps (or other https) link to the site, shown as "Open in Google Maps".
  map_url          text check (map_url is null or map_url ~ '^https://[^[:space:]]+$'),
  zoning_notes     text,
  -- approvals: shown only as entered by ASMS; never implied when empty
  approval         text,
  rera             text,
  availability     text,
  description      text,
  amenities        text[] not null default '{}',
  nearby           jsonb not null default '[]' check (jsonb_typeof(nearby) = 'array'),
  documents        jsonb not null default '[]' check (jsonb_typeof(documents) = 'array'),
  images           jsonb not null default '[]' check (jsonb_typeof(images) = 'array'),
  posted_on        date default current_date,
  last_confirmed_on date default current_date,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists properties_stage on public.properties (stage);
-- Seller listings: who listed it, what the reviewer asked for, and when it was sent for review.
alter table public.properties add column if not exists seller_id uuid references public.seller_profiles (user_id) on delete set null;
alter table public.properties add column if not exists review_note text check (review_note is null or char_length(review_note) <= 2000);
alter table public.properties add column if not exists submitted_at timestamptz;
create index if not exists properties_seller on public.properties (seller_id);

-- Photo paths are storage keys like "properties/<id>.webp". The build copies each
-- one to public/media/<path>, so anything else (.., absolute paths, odd characters)
-- must never get in.
create or replace function private.safe_media_path(path text) returns boolean
language sql immutable set search_path = '' as $$
  select path ~ '^[a-z0-9_-]+(/[A-Za-z0-9_-]+)*/[A-Za-z0-9_-]+\.(webp|jpe?g|png)$' and char_length(path) <= 200;
$$;

-- security definer: the check runs as whoever writes the row, and they cannot see
-- the private schema that safe_media_path lives in.
create or replace function private.valid_images(images jsonb) returns boolean
language sql immutable security definer set search_path = '' as $$
  select jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 30 and coalesce(bool_and(
           jsonb_typeof(i) = 'object' and private.safe_media_path(i ->> 'path')
           and char_length(coalesce(i ->> 'alt', '')) <= 300), true)
    from jsonb_array_elements(images) i;
$$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'properties_images_valid') then
    alter table public.properties add constraint properties_images_valid check (private.valid_images(images));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_image_path_valid') then
    alter table public.products add constraint products_image_path_valid check (image_path is null or private.safe_media_path(image_path));
  end if;
end $$;

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();
drop trigger if exists properties_touch on public.properties;
create trigger properties_touch before update on public.properties for each row execute function private.touch_updated_at();

-- ------------------------------------------------------ row level security ----
alter table public.staff              enable row level security;
alter table public.product_categories enable row level security;
alter table public.products           enable row level security;
alter table public.properties         enable row level security;

drop policy if exists "staff read staff" on public.staff;
create policy "staff read staff" on public.staff for select to authenticated using ((select public.is_staff()));
drop policy if exists "owners manage staff" on public.staff;
create policy "owners manage staff" on public.staff for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

drop policy if exists "public read categories" on public.product_categories;
create policy "public read categories" on public.product_categories for select to anon, authenticated using (true);
drop policy if exists "staff write categories" on public.product_categories;
create policy "staff write categories" on public.product_categories for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products for select to anon, authenticated using (published or (select public.is_staff()));
drop policy if exists "staff write products" on public.products;
create policy "staff write products" on public.products for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "public read published properties" on public.properties;
create policy "public read published properties" on public.properties for select to anon, authenticated
  using (stage in ('live', 'sold') or (select public.is_staff()) or (seller_id is not null and seller_id = (select auth.uid())));
drop policy if exists "staff write properties" on public.properties;
create policy "staff write properties" on public.properties for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- --------------------------------------------------------- photo storage ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff read media" on storage.objects;
create policy "staff read media" on storage.objects for select to authenticated using (bucket_id = 'media' and (select public.is_staff()));
drop policy if exists "staff upload media" on storage.objects;
create policy "staff upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (select public.is_staff()));
drop policy if exists "staff update media" on storage.objects;
create policy "staff update media" on storage.objects for update to authenticated using (bucket_id = 'media' and (select public.is_staff()));
drop policy if exists "staff delete media" on storage.objects;
create policy "staff delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and (select public.is_staff()));

-- ------------------------------------------------------------ enquiries ----
-- Leads from the website: property enquiries, site visit requests, product
-- quotes and general questions (PRD sections 8, 12, 13). Visitors can add one
-- but never read one back. Staff work them on the admin Enquiries tab.
-- Enquiries never trigger a site rebuild.
create table if not exists public.enquiries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  kind         text not null check (kind in ('property', 'visit', 'product', 'sell', 'general')),
  source       text not null default 'contact_page' check (source in ('contact_page', 'property_page', 'product_page')),
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  phone        text not null check (phone ~ '^[0-9+() -]{7,20}$'),
  email        text check (email is null or (char_length(email) <= 200 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  -- what it is about: a property reference, a product slug, or free text
  property_ref text check (property_ref is null or char_length(property_ref) <= 60),
  property_id  uuid references public.properties (id) on delete set null,
  product_slug text check (product_slug is null or char_length(product_slug) <= 120),
  interest     text check (interest is null or char_length(interest) <= 200),
  message      text check (message is null or char_length(message) <= 4000),
  -- site visit request: a preference, not a booking
  preferred_date date,
  preferred_time text check (preferred_time is null or preferred_time in ('Morning', 'Afternoon', 'Evening')),
  -- product quote
  organisation text check (organisation is null or char_length(organisation) <= 120),
  quantity     text check (quantity is null or char_length(quantity) <= 120),
  delivery_location text check (delivery_location is null or char_length(delivery_location) <= 160),
  consent      boolean not null check (consent),
  -- set by the database, never by the visitor
  repeat_contact boolean not null default false,
  -- staff workflow (PRD section 12 lead statuses)
  status       text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'visit_requested', 'negotiation', 'closed_won', 'closed_lost', 'not_interested')),
  assigned_to  text references public.staff (email) on update cascade on delete set null,
  follow_up_on date,
  notes        text check (notes is null or char_length(notes) <= 4000),
  updated_at   timestamptz not null default now(),
  check (kind = 'visit' or (message is not null and char_length(btrim(message)) > 0))
);
create index if not exists enquiries_created_at on public.enquiries (created_at desc);
create index if not exists enquiries_phone on public.enquiries (phone, created_at desc);
create index if not exists enquiries_property on public.enquiries (property_id);

-- Visitors may only fill the form's fields; everything else is the database's or staff's.
revoke all on public.enquiries from anon, authenticated;
grant insert (kind, source, name, phone, email, property_ref, product_slug, interest, message, preferred_date, preferred_time, organisation, quantity, delivery_location, consent)
  on public.enquiries to anon, authenticated;
grant select, delete on public.enquiries to authenticated;
grant update (status, assigned_to, follow_up_on, notes) on public.enquiries to authenticated;

alter table public.enquiries enable row level security;
drop policy if exists "anyone sends an enquiry" on public.enquiries;
create policy "anyone sends an enquiry" on public.enquiries for insert to anon, authenticated with check (true);
drop policy if exists "staff read enquiries" on public.enquiries;
create policy "staff read enquiries" on public.enquiries for select to authenticated using ((select public.is_staff()));
drop policy if exists "staff update enquiries" on public.enquiries;
create policy "staff update enquiries" on public.enquiries for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "staff delete enquiries" on public.enquiries;
create policy "staff delete enquiries" on public.enquiries for delete to authenticated using ((select public.is_staff()));

-- Tidies input, links the property, flags repeat contacts, refuses enquiries
-- for properties that are not live, and limits floods: 3 an hour from one
-- phone, 30 per 10 minutes overall.
create or replace function private.check_enquiry() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  prop public.properties%rowtype;
begin
  new.name := btrim(new.name);
  new.phone := btrim(new.phone);
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.interest := nullif(btrim(coalesce(new.interest, '')), '');
  new.message := nullif(btrim(coalesce(new.message, '')), '');
  new.property_ref := nullif(upper(btrim(coalesce(new.property_ref, ''))), '');
  new.status := case when new.kind = 'visit' then 'visit_requested' else 'new' end;
  new.assigned_to := null;
  new.follow_up_on := null;
  new.notes := null;
  new.created_at := now();
  if new.kind <> 'visit' then new.preferred_date := null; new.preferred_time := null; end if;
  if new.preferred_date is not null and new.preferred_date < current_date then
    raise exception 'The preferred visit date is in the past.' using errcode = 'P0001';
  end if;
  if new.property_ref is not null then
    select * into prop from public.properties where upper(reference) = new.property_ref;
    if found and prop.stage <> 'live' then
      raise exception 'This property is no longer available.' using errcode = 'P0001';
    end if;
    new.property_id := prop.id;  -- null when the reference is unknown; staff still see what was typed
  else
    new.property_id := null;
  end if;
  new.repeat_contact := exists (select 1 from public.enquiries where phone = new.phone and created_at > now() - interval '30 days');
  if (select count(*) from public.enquiries where phone = new.phone and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.enquiries where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many enquiries. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists enquiries_check on public.enquiries;
create trigger enquiries_check before insert on public.enquiries for each row execute function private.check_enquiry();
drop trigger if exists enquiries_touch on public.enquiries;
create trigger enquiries_touch before update on public.enquiries for each row execute function private.touch_updated_at();

-- Every staff change to an enquiry is recorded (PRD: "changes timestamped").
create table if not exists public.enquiry_history (
  id          bigint generated always as identity primary key,
  enquiry_id  uuid not null references public.enquiries (id) on delete cascade,
  at          timestamptz not null default now(),
  actor       text,
  field       text not null,
  old_value   text,
  new_value   text
);
create index if not exists enquiry_history_enquiry on public.enquiry_history (enquiry_id, at);
revoke all on public.enquiry_history from anon, authenticated;
grant select on public.enquiry_history to authenticated;
alter table public.enquiry_history enable row level security;
drop policy if exists "staff read enquiry history" on public.enquiry_history;
create policy "staff read enquiry history" on public.enquiry_history for select to authenticated using ((select public.is_staff()));

create or replace function private.log_enquiry_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  who text := nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
begin
  if new.status is distinct from old.status then
    insert into public.enquiry_history (enquiry_id, actor, field, old_value, new_value) values (new.id, who, 'status', old.status, new.status);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.enquiry_history (enquiry_id, actor, field, old_value, new_value) values (new.id, who, 'assigned_to', old.assigned_to, new.assigned_to);
  end if;
  if new.follow_up_on is distinct from old.follow_up_on then
    insert into public.enquiry_history (enquiry_id, actor, field, old_value, new_value) values (new.id, who, 'follow_up_on', old.follow_up_on::text, new.follow_up_on::text);
  end if;
  if new.notes is distinct from old.notes then
    insert into public.enquiry_history (enquiry_id, actor, field, old_value, new_value) values (new.id, who, 'notes', null, null);
  end if;
  return null;
end $$;

drop trigger if exists enquiries_log on public.enquiries;
create trigger enquiries_log after update on public.enquiries for each row execute function private.log_enquiry_change();

-- ---------------------------------------------------------------- events ----
-- First-party measurement (PRD section 14): property page views (after 3 s on
-- the page), WhatsApp button clicks and shares. Visitors are a random ID kept
-- in their browser; no names, phones or IP addresses are stored. Written only
-- through public.track(), which checks the property is live and ignores
-- repeats from the same browser within 10 minutes.
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  type        text not null check (type in ('property_view', 'whatsapp_click', 'property_shared')),
  property_id uuid not null references public.properties (id) on delete cascade,
  visitor     uuid not null,
  source      text check (source is null or char_length(source) <= 40)
);
create index if not exists events_property_at on public.events (property_id, at);
create index if not exists events_visitor_at on public.events (visitor, at);
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;
alter table public.events enable row level security;
drop policy if exists "staff read events" on public.events;
create policy "staff read events" on public.events for select to authenticated using ((select public.is_staff()));

create or replace function public.track(event_type text, property_ref text, visitor uuid, source text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pid uuid;
begin
  if event_type not in ('property_view', 'whatsapp_click', 'property_shared') or visitor is null then return; end if;
  if public.is_staff() then return; end if;  -- staff browsing their own site is not demand
  select id into pid from public.properties where upper(reference) = upper(btrim(property_ref)) and stage = 'live';
  if pid is null then return; end if;
  if exists (select 1 from public.events e where e.visitor = track.visitor and e.property_id = pid and e.type = event_type and e.at > now() - interval '10 minutes') then return; end if;
  if (select count(*) from public.events e where e.visitor = track.visitor and e.at > now() - interval '1 day') >= 300 then return; end if;
  insert into public.events (type, property_id, visitor, source) values (event_type, pid, visitor, left(source, 40));
end $$;

revoke execute on function public.track(text, text, uuid, text) from public;
grant execute on function public.track(text, text, uuid, text) to anon, authenticated;

-- Optional email alert for each new enquiry, sent through Resend (resend.com).
-- Needs three Vault secrets (see supabase/README.md); without them it does nothing.
create or replace function private.notify_enquiry() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  api_key text;
  send_to text;
  send_from text;
begin
  select decrypted_secret into api_key   from vault.decrypted_secrets where name = 'resend_api_key';
  select decrypted_secret into send_to   from vault.decrypted_secrets where name = 'enquiry_notify_to';
  select decrypted_secret into send_from from vault.decrypted_secrets where name = 'enquiry_notify_from';
  if api_key is null or send_to is null or send_from is null then return null; end if;
  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    body    := jsonb_build_object(
      'from', send_from,
      'to', string_to_array(replace(send_to, ' ', ''), ','),
      'subject', case new.kind when 'visit' then 'Site visit request' when 'product' then 'Product quote request' when 'property' then 'Property enquiry' when 'sell' then 'Owner wants to sell' else 'New enquiry' end
                 || coalesce(' (' || new.property_ref || ')', '') || ' from ' || new.name,
      'text', concat_ws(E'\n',
        'Name: ' || new.name,
        'Phone: ' || new.phone,
        'Email: ' || coalesce(new.email, 'not given'),
        'About: ' || coalesce(new.property_ref, new.product_slug, new.interest, 'not given'),
        case when new.kind = 'visit' then 'Preferred visit: ' || coalesce(to_char(new.preferred_date, 'DD Mon YYYY'), 'any day') || ', ' || coalesce(new.preferred_time, 'any time') end,
        case when new.kind = 'product' then 'Quantity: ' || coalesce(new.quantity, 'not given') || '; deliver to: ' || coalesce(new.delivery_location, 'not given') || coalesce('; organisation: ' || new.organisation, '') end,
        case when new.repeat_contact then 'Note: this phone number sent another enquiry in the last 30 days.' end,
        '',
        coalesce(new.message, ''),
        '',
        'Reply and track it in the admin panel, Enquiries tab.')),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'));
  return null;
end $$;

drop trigger if exists enquiries_notify on public.enquiries;
create trigger enquiries_notify after insert on public.enquiries for each row execute function private.notify_enquiry();

-- -------------------------------------------------------- seller portal ----
-- Sellers write their own listings while they are drafts (or sent back for
-- changes); everything after that goes through the functions below, so a
-- listing reaches the website only when staff approve it (PRD section 11).

-- The fields a seller may fill in. Reference, web address, stage, featured,
-- dates and the public documents list stay with staff.
create or replace function private.seller_fields() returns text[]
language sql immutable set search_path = '' as $$
  select array['title', 'category', 'property_type', 'transaction_type', 'ownership', 'location', 'locality',
    'price', 'price_negotiable', 'area_sqft', 'area_unit', 'dimensions', 'facing', 'bhk', 'bathrooms', 'carpet_area_sqft',
    'furnishing', 'floor_info', 'parking', 'possession', 'road_width_ft', 'frontage_ft', 'land_use', 'corner_plot',
    'boundary_wall', 'gated_layout', 'floors_allowed', 'usable_area_sqft', 'access_notes', 'map_url', 'zoning_notes',
    'approval', 'rera', 'availability', 'description', 'amenities', 'nearby', 'images'];
$$;

create sequence if not exists private.seller_reference;

-- Photos a seller adds must be ones they uploaded (media/sellers/<their id>/...);
-- photos already on the listing (for example ones staff added) may stay.
create or replace function private.seller_photos_ok(images jsonb, kept jsonb) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(bool_and(i ->> 'path' like 'sellers/' || auth.uid()::text || '/%'
                           or exists (select 1 from jsonb_array_elements(coalesce(kept, '[]')) k where k ->> 'path' = i ->> 'path')), true)
    from jsonb_array_elements(coalesce(images, '[]')) i;
$$;

create or replace function private.actor() returns text
language sql stable set search_path = '' as $$
  select nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
$$;

-- Staff write any field. A seller's insert or update keeps only the seller fields;
-- the rest is set here, whatever the request said. (No signed-in user means the
-- SQL editor or the service role; row level security already keeps visitors out.)
create or replace function private.guard_property() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_staff() or current_setting('asms.trusted', true) = 'on' then return new; end if;
  if not private.seller_photos_ok(new.images, case when tg_op = 'UPDATE' then old.images end) then
    raise exception 'Photos must be ones you uploaded.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.seller_id := auth.uid();
    new.reference := 'ASMS-S' || lpad(nextval('private.seller_reference')::text, 4, '0');
    new.slug := lower(new.reference);
    new.stage := 'draft';
    new.featured := false;
    new.sort_order := 0;
    new.documents := '[]';
    new.review_note := null;
    new.submitted_at := null;
    new.posted_on := null;
    new.last_confirmed_on := null;
    new.created_at := now();
    return new;
  end if;
  return jsonb_populate_record(old, (
    select coalesce(jsonb_object_agg(key, value), '{}') from jsonb_each(to_jsonb(new)) where key = any (private.seller_fields())));
end $$;

drop trigger if exists properties_guard on public.properties;
create trigger properties_guard before insert or update on public.properties for each row execute function private.guard_property();

drop policy if exists "sellers add listings" on public.properties;
create policy "sellers add listings" on public.properties for insert to authenticated
  with check (seller_id = (select auth.uid()) and stage = 'draft' and (select public.is_active_seller()));
drop policy if exists "sellers edit drafts" on public.properties;
create policy "sellers edit drafts" on public.properties for update to authenticated
  using (seller_id = (select auth.uid()) and stage in ('draft', 'changes_requested') and (select public.is_active_seller()))
  with check (seller_id = (select auth.uid()));
drop policy if exists "sellers delete drafts" on public.properties;
create policy "sellers delete drafts" on public.properties for delete to authenticated
  using (seller_id = (select auth.uid()) and stage = 'draft');

-- Profiles: sellers keep their own; staff see all and can suspend.
create or replace function private.guard_seller_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_staff() then return new; end if;
  new.user_id := auth.uid();
  new.email := lower(coalesce(auth.jwt() ->> 'email', ''));
  new.status := case when tg_op = 'INSERT' then 'active' else old.status end;
  new.created_at := case when tg_op = 'INSERT' then now() else old.created_at end;
  return new;
end $$;

drop trigger if exists seller_profiles_guard on public.seller_profiles;
create trigger seller_profiles_guard before insert or update on public.seller_profiles for each row execute function private.guard_seller_profile();
drop trigger if exists seller_profiles_touch on public.seller_profiles;
create trigger seller_profiles_touch before update on public.seller_profiles for each row execute function private.touch_updated_at();

alter table public.seller_profiles enable row level security;
drop policy if exists "sellers read own profile" on public.seller_profiles;
create policy "sellers read own profile" on public.seller_profiles for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));
drop policy if exists "sellers create own profile" on public.seller_profiles;
create policy "sellers create own profile" on public.seller_profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "sellers update own profile" on public.seller_profiles;
create policy "sellers update own profile" on public.seller_profiles for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff())) with check (user_id = (select auth.uid()) or (select public.is_staff()));
revoke delete on public.seller_profiles from anon, authenticated;
revoke all on public.seller_profiles from anon;

-- Private documents (patta, EC, approvals...): reviewers only, never visitors.
create table if not exists public.seller_documents (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  seller_id   uuid not null references public.seller_profiles (user_id) on delete cascade,
  label       text not null check (char_length(btrim(label)) between 1 and 80),
  path        text not null unique,
  file_name   text check (file_name is null or char_length(file_name) <= 200),
  size_bytes  int check (size_bytes is null or size_bytes >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists seller_documents_property on public.seller_documents (property_id);
revoke all on public.seller_documents from anon;
alter table public.seller_documents enable row level security;
drop policy if exists "read own or staff documents" on public.seller_documents;
create policy "read own or staff documents" on public.seller_documents for select to authenticated using (seller_id = (select auth.uid()) or (select public.is_staff()));
drop policy if exists "sellers add documents to editable listings" on public.seller_documents;
create policy "sellers add documents to editable listings" on public.seller_documents for insert to authenticated
  with check (seller_id = (select auth.uid()) and (select public.is_active_seller()) and path like (select auth.uid())::text || '/%'
    and exists (select 1 from public.properties p where p.id = property_id and p.seller_id = (select auth.uid()) and p.stage in ('draft', 'changes_requested')));
drop policy if exists "sellers remove documents from editable listings" on public.seller_documents;
create policy "sellers remove documents from editable listings" on public.seller_documents for delete to authenticated
  using ((select public.is_staff()) or (seller_id = (select auth.uid())
    and exists (select 1 from public.properties p where p.id = property_id and p.seller_id = (select auth.uid()) and p.stage in ('draft', 'changes_requested'))));
revoke update on public.seller_documents from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-docs', 'seller-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sellers upload own documents" on storage.objects;
create policy "sellers upload own documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'seller-docs' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_active_seller()));
drop policy if exists "sellers and staff read documents" on storage.objects;
create policy "sellers and staff read documents" on storage.objects for select to authenticated
  using (bucket_id = 'seller-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));
drop policy if exists "sellers delete own documents" on storage.objects;
create policy "sellers delete own documents" on storage.objects for delete to authenticated
  using (bucket_id = 'seller-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Listing photos go to the public media bucket under sellers/<their id>/.
drop policy if exists "sellers upload listing photos" on storage.objects;
create policy "sellers upload listing photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'sellers' and (storage.foldername(name))[2] = (select auth.uid())::text and (select public.is_active_seller()));
drop policy if exists "sellers read own listing photos" on storage.objects;
create policy "sellers read own listing photos" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'sellers' and (storage.foldername(name))[2] = (select auth.uid())::text);
drop policy if exists "sellers delete own listing photos" on storage.objects;
create policy "sellers delete own listing photos" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'sellers' and (storage.foldername(name))[2] = (select auth.uid())::text);

-- Edits to a live listing wait here until staff approve them ("live-edit revisions").
create table if not exists public.property_revisions (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  seller_id   uuid not null references public.seller_profiles (user_id) on delete cascade,
  changes     jsonb not null check (jsonb_typeof(changes) = 'object'),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  note        text check (note is null or char_length(note) <= 2000),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);
create unique index if not exists property_revisions_one_pending on public.property_revisions (property_id) where status = 'pending';
revoke all on public.property_revisions from anon, authenticated;
grant select on public.property_revisions to authenticated;
alter table public.property_revisions enable row level security;
drop policy if exists "read own or staff revisions" on public.property_revisions;
create policy "read own or staff revisions" on public.property_revisions for select to authenticated using (seller_id = (select auth.uid()) or (select public.is_staff()));

-- Who did what to which listing or seller. Written only by the database; staff read it.
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       text,
  property_id uuid references public.properties (id) on delete set null,
  seller_id   uuid,
  action      text not null,
  note        text,
  detail      jsonb
);
create index if not exists audit_log_property on public.audit_log (property_id, at);
create index if not exists audit_log_at on public.audit_log (at desc);
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
alter table public.audit_log enable row level security;
drop policy if exists "staff read audit log" on public.audit_log;
create policy "staff read audit log" on public.audit_log for select to authenticated using ((select public.is_staff()));

create or replace function private.log_property() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor, property_id, seller_id, action) values (private.actor(), new.id, new.seller_id, 'created');
  elsif new.stage is distinct from old.stage then
    insert into public.audit_log (actor, property_id, seller_id, action, note, detail)
    values (private.actor(), new.id, new.seller_id, 'stage', nullif(current_setting('asms.note', true), ''), jsonb_build_object('from', old.stage, 'to', new.stage));
  end if;
  return null;
end $$;

drop trigger if exists properties_log on public.properties;
create trigger properties_log after insert or update on public.properties for each row execute function private.log_property();

create or replace function private.log_seller() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor, seller_id, action, detail) values (private.actor(), new.user_id, 'seller_status', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return null;
end $$;

drop trigger if exists seller_profiles_log on public.seller_profiles;
create trigger seller_profiles_log after update on public.seller_profiles for each row execute function private.log_seller();

-- What a listing still needs before it can be sent for review.
create or replace function public.listing_gaps(p public.properties) returns text[]
language sql stable set search_path = '' as $$
  select array_remove(array[
    case when char_length(btrim(coalesce(p.title, ''))) < 5 then 'a title' end,
    case when btrim(coalesce(p.location, '')) = '' then 'the location' end,
    case when p.area_sqft is null then 'the area' end,
    case when char_length(btrim(coalesce(p.description, ''))) < 50 then 'a description of at least 50 characters' end,
    case when jsonb_array_length(p.images) < 3 then 'at least 3 photos' end
  ], null);
$$;

-- Seller: send a draft (or a corrected listing) for review.
create or replace function public.submit_listing(listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties%rowtype;
  gaps text[];
begin
  select * into p from public.properties where id = listing and seller_id = auth.uid() for update;
  if not found then raise exception 'Listing not found.' using errcode = 'P0002'; end if;
  if not public.is_active_seller() then raise exception 'Your seller account is suspended.' using errcode = '42501'; end if;
  if p.stage not in ('draft', 'changes_requested') then raise exception 'This listing has already been sent for review.' using errcode = 'P0001'; end if;
  gaps := public.listing_gaps(p);
  if cardinality(gaps) > 0 then raise exception 'Still needed: %.', array_to_string(gaps, ', ') using errcode = 'P0001'; end if;
  perform set_config('asms.trusted', 'on', true);
  update public.properties set stage = 'submitted', submitted_at = now() where id = listing;
  perform set_config('asms.trusted', 'off', true);
end $$;

-- Seller: pause, resume, mark sold, reconfirm availability, or withdraw a submission.
create or replace function public.seller_listing_action(listing uuid, action text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties%rowtype;
  next_stage text;
begin
  select * into p from public.properties where id = listing and seller_id = auth.uid() for update;
  if not found then raise exception 'Listing not found.' using errcode = 'P0002'; end if;
  if action not in ('pause', 'sold') and not public.is_active_seller() then raise exception 'Your seller account is suspended.' using errcode = '42501'; end if;
  next_stage := case
    when action = 'pause' and p.stage = 'live' then 'paused'
    when action = 'resume' and p.stage = 'paused' then 'live'
    when action = 'sold' and p.stage in ('live', 'paused') then 'sold'
    when action = 'reconfirm' and p.stage = 'live' then 'live'
    when action = 'withdraw' and p.stage = 'submitted' then 'draft'
  end;
  if next_stage is null then raise exception 'That isn''t possible for this listing right now.' using errcode = 'P0001'; end if;
  perform set_config('asms.trusted', 'on', true);
  update public.properties
     set stage = next_stage,
         last_confirmed_on = case when action in ('resume', 'reconfirm') then current_date else last_confirmed_on end
   where id = listing;
  perform set_config('asms.trusted', 'off', true);
  if action = 'reconfirm' then
    insert into public.audit_log (actor, property_id, seller_id, action) values (private.actor(), listing, p.seller_id, 'reconfirmed');
  end if;
end $$;

-- Seller: propose changes to a live or paused listing. They wait for review.
create or replace function public.submit_revision(listing uuid, changes jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties%rowtype;
  allowed jsonb;
begin
  select * into p from public.properties where id = listing and seller_id = auth.uid();
  if not found then raise exception 'Listing not found.' using errcode = 'P0002'; end if;
  if not public.is_active_seller() then raise exception 'Your seller account is suspended.' using errcode = '42501'; end if;
  if p.stage not in ('live', 'paused') then raise exception 'Only live or paused listings take change requests.' using errcode = 'P0001'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}') into allowed
    from jsonb_each(coalesce(changes, '{}')) where key = any (private.seller_fields()) and value is distinct from to_jsonb(p) -> key;
  if allowed = '{}' then raise exception 'There are no changes to send.' using errcode = 'P0001'; end if;
  if not private.seller_photos_ok(allowed -> 'images', p.images) then
    raise exception 'Photos must be ones you uploaded.' using errcode = '42501';
  end if;
  if allowed ? 'images' and not private.valid_images(allowed -> 'images') then
    raise exception 'One of the photos is not valid.' using errcode = 'P0001';
  end if;
  if public.listing_gaps(jsonb_populate_record(p, allowed)) <> '{}' then
    raise exception 'Still needed: %.', array_to_string(public.listing_gaps(jsonb_populate_record(p, allowed)), ', ') using errcode = 'P0001';
  end if;
  update public.property_revisions set status = 'withdrawn' where property_id = listing and status = 'pending';
  insert into public.property_revisions (property_id, seller_id, changes) values (listing, p.seller_id, allowed);
  insert into public.audit_log (actor, property_id, seller_id, action, detail) values (private.actor(), listing, p.seller_id, 'revision_submitted', jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(allowed) k)));
end $$;

-- Staff: review decisions. Requesting changes or rejecting needs a note for the seller.
create or replace function public.review_listing(listing uuid, decision text, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties%rowtype;
  clean text := nullif(btrim(coalesce(note, '')), '');
  next_stage text;
begin
  if not public.is_staff() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into p from public.properties where id = listing for update;
  if not found then raise exception 'Listing not found.' using errcode = 'P0002'; end if;
  next_stage := case
    when decision = 'start' and p.stage = 'submitted' then 'under_review'
    when decision = 'changes' and p.stage in ('submitted', 'under_review') then 'changes_requested'
    when decision = 'reject' and p.stage in ('submitted', 'under_review', 'changes_requested') then 'rejected'
    when decision = 'approve' and p.stage in ('submitted', 'under_review') then 'live'
  end;
  if next_stage is null then raise exception 'That decision isn''t possible at this stage.' using errcode = 'P0001'; end if;
  if decision in ('changes', 'reject') and clean is null then raise exception 'Write a note telling the seller why.' using errcode = 'P0001'; end if;
  perform set_config('asms.note', coalesce(clean, ''), true);
  update public.properties
     set stage = next_stage,
         review_note = case when decision in ('changes', 'reject') then clean else null end,
         slug = case when decision = 'approve' then trim(both '-' from regexp_replace(lower(title || ' ' || reference), '[^a-z0-9]+', '-', 'g')) else slug end,
         posted_on = case when decision = 'approve' then current_date else posted_on end,
         last_confirmed_on = case when decision = 'approve' then current_date else last_confirmed_on end
   where id = listing;
  perform set_config('asms.note', '', true);
end $$;

-- Staff: apply or turn down a seller's change request on a live listing.
create or replace function public.review_revision(revision uuid, decision text, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.property_revisions%rowtype;
  clean text := nullif(btrim(coalesce(note, '')), '');
  sets text;
begin
  if not public.is_staff() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into r from public.property_revisions where id = revision and status = 'pending' for update;
  if not found then raise exception 'This change request was already handled.' using errcode = 'P0002'; end if;
  if decision not in ('approve', 'reject') then raise exception 'Unknown decision.' using errcode = 'P0001'; end if;
  if decision = 'reject' and clean is null then raise exception 'Write a note telling the seller why.' using errcode = 'P0001'; end if;
  if decision = 'approve' then
    select string_agg(format('%I = r.%I', k, k), ', ') into sets from jsonb_object_keys(r.changes) k where k = any (private.seller_fields());
    if sets is not null then
      execute format('update public.properties p set %s from jsonb_populate_record(null::public.properties, $1) r where p.id = $2', sets) using r.changes, r.property_id;
    end if;
  end if;
  update public.property_revisions set status = case when decision = 'approve' then 'approved' else 'rejected' end,
         note = clean, reviewed_at = now(), reviewed_by = private.actor() where id = revision;
  insert into public.audit_log (actor, property_id, seller_id, action, note)
  values (private.actor(), r.property_id, r.seller_id, case when decision = 'approve' then 'revision_approved' else 'revision_rejected' end, clean);
end $$;

-- The listing's history for its seller (staff names are not shown) or for staff.
create or replace function public.listing_history(listing uuid)
returns table (at timestamptz, by_seller boolean, action text, note text, detail jsonb)
language sql stable security definer set search_path = '' as $$
  select a.at, a.actor is not distinct from s.email, a.action, a.note, a.detail
    from public.audit_log a
    join public.properties p on p.id = a.property_id
    left join public.seller_profiles s on s.user_id = p.seller_id
   where a.property_id = listing and (public.is_staff() or p.seller_id = auth.uid())
   order by a.at, a.id;
$$;

revoke execute on function public.submit_listing(uuid), public.seller_listing_action(uuid, text), public.submit_revision(uuid, jsonb),
  public.review_listing(uuid, text, text), public.review_revision(uuid, text, text), public.listing_history(uuid), public.listing_gaps(public.properties) from public, anon;
grant execute on function public.submit_listing(uuid), public.seller_listing_action(uuid, text), public.submit_revision(uuid, jsonb),
  public.review_listing(uuid, text, text), public.review_revision(uuid, text, text), public.listing_history(uuid), public.listing_gaps(public.properties) to authenticated;

-- ------------------------------------------------- automatic site rebuild ----
-- Content changes call GitHub's repository_dispatch API, which runs the
-- "Deploy to Hostinger" workflow. The token and repo live in Supabase Vault
-- (see supabase/README.md); without them this is a silent no-op.
create or replace function private.dispatch_rebuild() returns void
language plpgsql security definer set search_path = '' as $$
declare
  token text;
  repo  text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_dispatch_token';
  select decrypted_secret into repo  from vault.decrypted_secrets where name = 'github_repo';
  if token is null or repo is null then return; end if;
  perform net.http_post(
    url     := 'https://api.github.com/repos/' || repo || '/dispatches',
    body    := jsonb_build_object('event_type', 'content-updated'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'User-Agent', 'asms-rounaqh-supabase',
      'Content-Type', 'application/json'));
end $$;

-- Fires once per statement, and only when rows really changed (a blocked or
-- no-op write must not be able to trigger rebuilds).
create or replace function private.rebuild_on_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from changed) then perform private.dispatch_rebuild(); end if;
  return null;
end $$;

-- Properties rebuild only when a row that is (or was) on the website changed, so
-- drafts, seller autosaves and review steps never start a deploy.
create or replace function private.rebuild_on_property_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  public_rows boolean;
begin
  -- Each branch reads only the transition tables its operation has.
  if tg_op = 'INSERT' then
    public_rows := exists (select 1 from changed where stage in ('live', 'sold'));
  elsif tg_op = 'DELETE' then
    public_rows := exists (select 1 from gone where stage in ('live', 'sold'));
  else
    public_rows := exists (select 1 from changed c join gone g on g.id = c.id where c.stage in ('live', 'sold') or g.stage in ('live', 'sold'));
  end if;
  if public_rows then perform private.dispatch_rebuild(); end if;
  return null;
end $$;

drop trigger if exists properties_rebuild on public.properties;
drop trigger if exists properties_rebuild_ins on public.properties;
drop trigger if exists properties_rebuild_upd on public.properties;
drop trigger if exists properties_rebuild_del on public.properties;
create trigger properties_rebuild_ins after insert on public.properties referencing new table as changed for each statement execute function private.rebuild_on_property_change();
create trigger properties_rebuild_upd after update on public.properties referencing old table as gone new table as changed for each statement execute function private.rebuild_on_property_change();
create trigger properties_rebuild_del after delete on public.properties referencing old table as gone for each statement execute function private.rebuild_on_property_change();

do $$
declare t text;
begin
  foreach t in array array['products', 'product_categories'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_rebuild', t);
    execute format('drop trigger if exists %I on public.%I', t || '_rebuild_ins', t);
    execute format('drop trigger if exists %I on public.%I', t || '_rebuild_upd', t);
    execute format('drop trigger if exists %I on public.%I', t || '_rebuild_del', t);
    execute format('create trigger %I after insert on public.%I referencing new table as changed for each statement execute function private.rebuild_on_change()', t || '_rebuild_ins', t);
    execute format('create trigger %I after update on public.%I referencing new table as changed for each statement execute function private.rebuild_on_change()', t || '_rebuild_upd', t);
    execute format('create trigger %I after delete on public.%I referencing old table as changed for each statement execute function private.rebuild_on_change()', t || '_rebuild_del', t);
  end loop;
end $$;

-- "Publish now" button in the admin panel.
create or replace function public.request_site_rebuild() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Not allowed' using errcode = '42501'; end if;
  perform private.dispatch_rebuild();
end $$;

revoke execute on function public.request_site_rebuild() from public, anon;
grant execute on function public.request_site_rebuild() to authenticated;

-- ------------------------------------------------------------ seed data ----
insert into public.product_categories (id, name, intro, icon, sort_order) values
  ('steel-peb', 'Structural steel & PEB', 'Reinforcement and structural steel, plus pre-engineered building components for industrial and commercial sheds.', 'layers', 1),
  ('roofing', 'Roofing & building materials', 'Roofing sheets, ventilation and walling materials for homes, warehouses and factories.', 'roof', 2),
  ('concrete-finishing', 'Concrete & finishing', 'Cement, concrete and finishing products from foundation to final coat.', 'brick', 3)
on conflict (id) do nothing;

-- Typical product lines as unpublished drafts: review, add photos, then publish.
insert into public.products (slug, category_id, name, summary, specs, unit, sort_order) values
  ('tmt-reinforcement-bars', 'steel-peb', 'TMT reinforcement bars', 'Thermo-mechanically treated bars for RCC work.', '[{"label":"Grades","value":"Fe 500 / Fe 500D / Fe 550D"},{"label":"Diameters","value":"8 to 32 mm"},{"label":"Standard","value":"IS 1786"}]', 'Per tonne', 1),
  ('structural-sections', 'steel-peb', 'Structural sections', 'Beams, channels and angles for frames and fabrication.', '[{"label":"Types","value":"ISMB, ISMC, angles"},{"label":"Grade","value":"E250 / E350"},{"label":"Standard","value":"IS 2062"}]', 'Per tonne', 2),
  ('peb-frames', 'steel-peb', 'PEB frames', 'Built-up primary members designed to your shed dimensions.', '[{"label":"Span","value":"Project specific"},{"label":"Finish","value":"Primer / painted"},{"label":"Supply","value":"Design, fabrication, erection"}]', 'Per project', 3),
  ('c-z-purlins', 'steel-peb', 'C & Z purlins', 'Cold-formed galvanised purlins and girts for roofing and cladding.', '[{"label":"Profiles","value":"C and Z"},{"label":"Thickness","value":"1.6 to 3.15 mm"},{"label":"Coating","value":"Galvanised"}]', 'Per running metre', 4),
  ('colour-coated-roofing-sheets', 'roofing', 'Colour-coated roofing sheets', 'Pre-painted profile sheets for durable, weather-resistant roofs.', '[{"label":"Thickness","value":"0.35 to 0.60 mm"},{"label":"Profile","value":"Trapezoidal / corrugated"},{"label":"Base","value":"Galvalume / GI"}]', 'Per sq ft', 1),
  ('polycarbonate-sheets', 'roofing', 'Polycarbonate sheets', 'Translucent sheets for skylights and daylighting.', '[{"label":"Type","value":"Multiwall / solid"},{"label":"Thickness","value":"2 to 10 mm"},{"label":"UV protection","value":"Yes"}]', 'Per sq ft', 2),
  ('turbo-ventilators', 'roofing', 'Turbo ventilators', 'Wind-driven roof ventilators for heat and fume extraction.', '[{"label":"Throat size","value":"Up to 24 in"},{"label":"Material","value":"Aluminium / SS"},{"label":"Power","value":"None required"}]', 'Per unit', 3),
  ('aac-blocks', 'roofing', 'AAC blocks', 'Lightweight autoclaved aerated concrete blocks for walling.', '[{"label":"Size","value":"600 × 200 mm"},{"label":"Thickness","value":"100 to 250 mm"},{"label":"Standard","value":"IS 2185 (Part 3)"}]', 'Per cubic metre', 4),
  ('cement-opc-ppc', 'concrete-finishing', 'Cement (OPC / PPC)', 'Bagged cement for structural and general construction.', '[{"label":"Types","value":"OPC 53, PPC"},{"label":"Pack","value":"50 kg bag"},{"label":"Standard","value":"IS 269 / IS 1489"}]', 'Per bag', 1),
  ('ready-mix-concrete', 'concrete-finishing', 'Ready-mix concrete', 'Batched concrete delivered to site by transit mixer.', '[{"label":"Grades","value":"M20 to M40"},{"label":"Delivery","value":"Transit mixer"},{"label":"Pumping","value":"On request"}]', 'Per cubic metre', 2),
  ('paver-blocks', 'concrete-finishing', 'Paver blocks', 'Interlocking blocks for driveways, walkways and yards.', '[{"label":"Thickness","value":"60 / 80 mm"},{"label":"Shapes","value":"Zig-zag, I, rectangle"},{"label":"Finish","value":"Natural / coloured"}]', 'Per sq ft', 3),
  ('tile-adhesive-wall-putty', 'concrete-finishing', 'Tile adhesive & wall putty', 'Cement-based adhesive and putty for tiling and smooth walls.', '[{"label":"Adhesive types","value":"C1 / C2"},{"label":"Putty","value":"White cement based"},{"label":"Pack","value":"20 to 40 kg"}]', 'Per bag', 4)
on conflict (slug) do nothing;
