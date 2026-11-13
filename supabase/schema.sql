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

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where email = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'owner');
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
  image_path   text,
  image_alt    text,
  published    boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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
create policy "staff read staff" on public.staff for select to authenticated using (public.is_staff());
drop policy if exists "owners manage staff" on public.staff;
create policy "owners manage staff" on public.staff for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "public read categories" on public.product_categories;
create policy "public read categories" on public.product_categories for select to anon, authenticated using (true);
drop policy if exists "staff write categories" on public.product_categories;
create policy "staff write categories" on public.product_categories for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products for select to anon, authenticated using (published or public.is_staff());
drop policy if exists "staff write products" on public.products;
create policy "staff write products" on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public read published properties" on public.properties;
create policy "public read published properties" on public.properties for select to anon, authenticated using (stage in ('live', 'sold') or public.is_staff());
drop policy if exists "staff write properties" on public.properties;
create policy "staff write properties" on public.properties for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --------------------------------------------------------- photo storage ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff read media" on storage.objects;
create policy "staff read media" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_staff());
drop policy if exists "staff upload media" on storage.objects;
create policy "staff upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
drop policy if exists "staff update media" on storage.objects;
create policy "staff update media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
drop policy if exists "staff delete media" on storage.objects;
create policy "staff delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());

-- ------------------------------------------------------------ enquiries ----
-- Leads from the website: property enquiries, site visit requests, product
-- quotes and general questions (PRD sections 8, 12, 13). Visitors can add one
-- but never read one back. Staff work them on the admin Enquiries tab.
-- Enquiries never trigger a site rebuild.
create table if not exists public.enquiries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  kind         text not null check (kind in ('property', 'visit', 'product', 'general')),
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
create policy "staff read enquiries" on public.enquiries for select to authenticated using (public.is_staff());
drop policy if exists "staff update enquiries" on public.enquiries;
create policy "staff update enquiries" on public.enquiries for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff delete enquiries" on public.enquiries;
create policy "staff delete enquiries" on public.enquiries for delete to authenticated using (public.is_staff());

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
create policy "staff read enquiry history" on public.enquiry_history for select to authenticated using (public.is_staff());

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
create policy "staff read events" on public.events for select to authenticated using (public.is_staff());

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
      'subject', case new.kind when 'visit' then 'Site visit request' when 'product' then 'Product quote request' when 'property' then 'Property enquiry' else 'New enquiry' end
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

do $$
declare t text;
begin
  foreach t in array array['properties', 'products', 'product_categories'] loop
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
