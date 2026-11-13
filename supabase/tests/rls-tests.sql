-- Each block runs as a role with a JWT email and prints PASS/FAIL lines.
\set ON_ERROR_STOP 0
\pset tuples_only on
\pset format unaligned

-- setup as superuser
insert into public.staff (email, role) values ('owner@asms.test', 'owner'), ('editor@asms.test', 'editor');
insert into public.properties (slug, reference, title, stage) values ('pub', 'R-1', 'Published', 'live'), ('draft', 'R-2', 'Draft', 'draft'), ('gone', 'R-4', 'Sold one', 'sold'), ('held', 'R-5', 'Paused', 'paused');
update public.products set published = true where slug = 'aac-blocks';
insert into vault.decrypted_secrets values ('github_dispatch_token', 'tok'), ('github_repo', 'Dentrebair/asms-re');
truncate net.calls;

create function pg_temp.check(label text, ok boolean) returns text language sql as $$ select case when ok then 'PASS ' else 'FAIL ' end || label $$;

-- ---------- anonymous visitor
set role anon; set request.jwt.claims = '{}';
select pg_temp.check('anon sees only live and sold properties', (select array_agg(slug order by slug) from public.properties) = array['gone', 'pub']);
select pg_temp.check('anon sees only published products', (select count(*) from public.products) = 1);
select pg_temp.check('anon cannot read staff', (select count(*) from public.staff) = 0);
update public.properties set title = 'hacked'; delete from public.products;
insert into public.properties (slug, reference, title) values ('x', 'X', 'x');
insert into storage.objects (bucket_id, name) values ('media', 'evil.webp');
select public.request_site_rebuild();
reset role;
select pg_temp.check('anon changed nothing', (select count(*) from public.properties where title = 'hacked') = 0 and (select count(*) from public.products) = 12 and (select count(*) from public.properties) = 4 and (select count(*) from storage.objects) = 0);

-- ---------- signed-in stranger (not on staff list)
set role authenticated; set request.jwt.claims = '{"email":"stranger@gmail.com"}';
select pg_temp.check('stranger sees only live and sold', (select count(*) from public.properties) = 2);
update public.properties set title = 'hacked'; delete from public.properties;
insert into public.staff (email, role) values ('stranger@gmail.com', 'owner');
insert into storage.objects (bucket_id, name) values ('media', 'evil.webp');
select public.request_site_rebuild();
reset role;
select pg_temp.check('stranger changed nothing', (select count(*) from public.properties) = 4 and (select count(*) from public.staff) = 2 and (select count(*) from storage.objects) = 0);
select pg_temp.check('blocked writes sent no rebuilds', (select count(*) from net.calls) = 0);

-- ---------- editor
set role authenticated; set request.jwt.claims = '{"email":"Editor@ASMS.test"}';
select pg_temp.check('editor sees drafts too', (select count(*) from public.properties) = 4);
insert into public.properties (slug, reference, title, stage, price, area_sqft) values ('new-plot', 'R-3', 'New plot', 'live', 4800000, 1200);
update public.products set published = true where category_id = 'roofing';
insert into storage.objects (bucket_id, name) values ('media', 'properties/a.webp');
insert into storage.objects (bucket_id, name) values ('other-bucket', 'x.webp');
insert into public.staff (email, role) values ('friend@gmail.com', 'owner');
select public.request_site_rebuild();
reset role;
select pg_temp.check('editor wrote content', (select count(*) from public.properties) = 5 and (select count(*) from public.products where published) = 4);
select pg_temp.check('editor uploaded only to media', (select array_agg(bucket_id) from storage.objects) = array['media']);
select pg_temp.check('editor cannot add staff', (select count(*) from public.staff) = 2);
select pg_temp.check('each write statement + publish button = 1 rebuild call each (3)', (select count(*) from net.calls) = 3);
select pg_temp.check('rebuild call targets the repo dispatch URL', (select bool_and(url = 'https://api.github.com/repos/Dentrebair/asms-re/dispatches' and headers ->> 'Authorization' = 'Bearer tok' and body ->> 'event_type' = 'content-updated') from net.calls));

-- ---------- owner
set role authenticated; set request.jwt.claims = '{"email":"owner@asms.test"}';
insert into public.staff (email, name, role) values ('staff2@asms.test', 'Staff Two', 'editor');
select pg_temp.check('owner adds staff', (select count(*) from public.staff) = 3);
delete from public.staff where email = 'owner@asms.test';
reset role;
select pg_temp.check('last owner cannot be removed', (select count(*) from public.staff where role = 'owner') = 1);

-- ---------- data constraints
insert into public.properties (slug, reference, title) values ('Bad Slug!', 'R-9', 'x');
insert into public.properties (slug, reference, title, price) values ('neg', 'R-10', 'x', -5);
insert into public.staff (email) values ('NotLower@x.com');
insert into public.properties (slug, reference, title, stage) values ('odd', 'R-11', 'x', 'published');
insert into public.properties (slug, reference, title, category) values ('odd2', 'R-12', 'x', 'industrial');
select pg_temp.check('unknown stage or category rejected', (select count(*) from public.properties where reference in ('R-11','R-12')) = 0);
select pg_temp.check('bad slug / negative price / uppercase email rejected', (select count(*) from public.properties where reference in ('R-9','R-10')) = 0 and (select count(*) from public.staff where email ilike 'notlower%') = 0);

-- ---------- enquiries
truncate net.calls;
insert into vault.decrypted_secrets values ('resend_api_key', 're_test'), ('enquiry_notify_to', 'sales@asms.test, owner@asms.test'), ('enquiry_notify_from', 'Website <web@asms.test>');
set role anon; set request.jwt.claims = '{}';
insert into public.enquiries (kind, source, name, phone, email, property_ref, message, consent)
  values ('property', 'property_page', '  Priya  ', '+91 98400 12345', ' Priya@Example.COM ', 'r-1', 'Is the plot still available?', true);
select pg_temp.check('anon cannot read enquiries back', (select count(*) from public.enquiries) = 0);
insert into public.enquiries (kind, name, phone, message, consent, status) values ('general', 'Sneaky', '9840012345', 'x', true, 'closed_won');
insert into public.enquiries (kind, name, phone, message, consent, repeat_contact) values ('general', 'Sneaky2', '9840012399', 'x', true, true);
insert into public.enquiries (kind, name, phone, message, consent) values ('general', 'No consent', '9840012346', 'x', false);
insert into public.enquiries (kind, name, phone, message, consent) values ('general', 'Bad phone', 'call me', 'x', true);
insert into public.enquiries (kind, name, phone, message, consent) values ('loans', 'Bad kind', '9840012347', 'x', true);
insert into public.enquiries (kind, name, phone, consent) values ('property', 'No message', '9840012348', true);
insert into public.enquiries (kind, name, phone, property_ref, message, consent) values ('property', 'Sold one', '9840012349', 'R-4', 'still there?', true);
insert into public.enquiries (kind, name, phone, property_ref, preferred_date, consent) values ('visit', 'Past date', '9840012350', 'R-1', current_date - 1, true);
update public.enquiries set status = 'closed_won'; delete from public.enquiries;
reset role;
select pg_temp.check('anon enquiry saved, tidied and linked to the property', (select count(*) from public.enquiries) = 1
  and (select name = 'Priya' and email = 'priya@example.com' and status = 'new' and property_ref = 'R-1'
       and property_id = (select id from public.properties where reference = 'R-1') and not repeat_contact from public.enquiries));
select pg_temp.check('refused: status/flags set by visitor, no consent, bad phone or kind, empty message, sold property, past visit date', (select count(*) from public.enquiries) = 1);
select pg_temp.check('anon cannot change or delete enquiries', (select status from public.enquiries) = 'new');
select pg_temp.check('enquiry sends one email alert, no rebuild', (select count(*) from net.calls) = 1
  and (select bool_and(url = 'https://api.resend.com/emails' and headers ->> 'Authorization' = 'Bearer re_test'
       and body -> 'to' = '["sales@asms.test","owner@asms.test"]'::jsonb and body ->> 'subject' = 'Property enquiry (R-1) from Priya') from net.calls));

set role anon; set request.jwt.claims = '{}';
insert into public.enquiries (kind, source, name, phone, property_ref, preferred_date, preferred_time, consent)
  values ('visit', 'property_page', 'Priya', '+91 98400 12345', 'R-1', current_date + 3, 'Morning', true);
insert into public.enquiries (kind, source, name, phone, product_slug, quantity, delivery_location, organisation, message, consent)
  values ('product', 'product_page', 'Arun', '9884011111', 'aac-blocks', '20 cubic metres', 'Tambaram', 'Arun Builders', 'Need delivery next week', true);
reset role;
select pg_temp.check('visit request needs no message, starts as visit_requested, flagged as a repeat contact',
  (select status = 'visit_requested' and repeat_contact and preferred_time = 'Morning' from public.enquiries where kind = 'visit'));
set role anon; set request.jwt.claims = '{}';
insert into public.enquiries (kind, name, phone, message, consent) values ('sell', 'Owner', '9884033333', 'I want to list my plot in Porur', true);
reset role;
select pg_temp.check('owners can ask to list a property', (select count(*) from public.enquiries where kind = 'sell') = 1);
select pg_temp.check('product quote keeps quantity and delivery', (select quantity = '20 cubic metres' and delivery_location = 'Tambaram' and property_id is null from public.enquiries where kind = 'product'));

set role authenticated; set request.jwt.claims = '{"email":"stranger@gmail.com"}';
select pg_temp.check('stranger cannot read enquiries', (select count(*) from public.enquiries) = 0);
update public.enquiries set status = 'closed_won';
reset role;
select pg_temp.check('stranger changed nothing on enquiries', (select count(*) from public.enquiries where status = 'closed_won') = 0);

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test"}';
select pg_temp.check('staff read enquiries', (select count(*) from public.enquiries) = 4);
update public.enquiries set status = 'contacted', assigned_to = 'editor@asms.test', follow_up_on = current_date + 2, notes = 'Called, site visit Saturday' where name = 'Priya' and kind = 'property';
update public.enquiries set message = 'rewritten', repeat_contact = true where kind = 'property';
reset role;
select pg_temp.check('staff update status, owner, follow-up and notes, but not what the visitor wrote',
  (select status = 'contacted' and assigned_to = 'editor@asms.test' and notes = 'Called, site visit Saturday' and message = 'Is the plot still available?' and not repeat_contact from public.enquiries where kind = 'property'));
select pg_temp.check('each change is in the history with who made it',
  (select count(*) from public.enquiry_history where actor = 'editor@asms.test') = 4
  and (select new_value from public.enquiry_history where field = 'status') = 'contacted');
set role anon; set request.jwt.claims = '{}';
select pg_temp.check('visitors cannot read history', (select count(*) from public.enquiry_history) = 0);
reset role;

set role anon; set request.jwt.claims = '{}';
insert into public.enquiries (kind, name, phone, message, consent) values ('general', 'Repeat', '+91 98400 12345', 'three', true);
insert into public.enquiries (kind, name, phone, message, consent) values ('general', 'Repeat', '+91 98400 12345', 'four', true);
reset role;
select pg_temp.check('fourth enquiry in an hour from one phone is refused', (select count(*) from public.enquiries where phone = '+91 98400 12345') = 3);

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test"}';
delete from public.enquiries where message = 'three';
reset role;
select pg_temp.check('staff delete an enquiry', (select count(*) from public.enquiries) = 4);

-- ---------- events
truncate net.calls;
set role anon; set request.jwt.claims = '{}';
select public.track('property_view', 'r-1', '00000000-0000-0000-0000-000000000001', 'detail');
select public.track('property_view', 'R-1', '00000000-0000-0000-0000-000000000001', 'detail');  -- repeat within 10 min: ignored
select public.track('whatsapp_click', 'R-1', '00000000-0000-0000-0000-000000000001', 'detail');
select public.track('property_view', 'R-1', '00000000-0000-0000-0000-000000000002', 'detail');
select public.track('property_view', 'R-2', '00000000-0000-0000-0000-000000000003', 'detail');  -- draft: ignored
select public.track('property_view', 'R-4', '00000000-0000-0000-0000-000000000003', 'detail');  -- sold: ignored
select public.track('enquiry_created', 'R-1', '00000000-0000-0000-0000-000000000003', 'detail');  -- not a trackable type
insert into public.events (type, property_id, visitor) select 'property_view', id, gen_random_uuid() from public.properties;
select pg_temp.check('visitors cannot read events', (select count(*) from public.events) = 0);
reset role;
select pg_temp.check('track records live views and clicks only, deduped per browser', (select count(*) from public.events) = 3
  and (select count(*) from public.events where type = 'property_view') = 2 and (select count(distinct visitor) from public.events) = 2);
select pg_temp.check('events trigger no rebuild', (select count(*) from net.calls) = 0);
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test"}';
select public.track('property_view', 'R-1', '00000000-0000-0000-0000-000000000009', 'detail');  -- staff browsing: ignored
select pg_temp.check('staff read events', (select count(*) from public.events) = 3);
reset role;
