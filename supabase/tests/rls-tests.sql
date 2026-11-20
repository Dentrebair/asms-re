-- Each block runs as a role with a JWT email and prints PASS/FAIL lines.
\set ON_ERROR_STOP 0
\pset tuples_only on
\pset format unaligned

-- setup as superuser
insert into public.staff (email, role) values ('owner@asms.test', 'owner'), ('editor@asms.test', 'editor');
-- Staff are recognised by a confirmed account in auth.users, not by the token's email claim.
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1', 'owner@asms.test', now()), ('00000000-0000-0000-0000-0000000000a2', 'editor@asms.test', now());
insert into public.properties (slug, reference, title, stage) values ('pub', 'R-1', 'Published', 'live'), ('draft', 'R-2', 'Draft', 'draft'), ('gone', 'R-4', 'Sold one', 'sold'), ('held', 'R-5', 'Paused', 'paused');
update public.products set published = true where slug = 'aac-blocks';
insert into vault.decrypted_secrets values ('github_dispatch_token', 'tok'), ('github_repo', 'Dentrebair/asms-re');
truncate net.calls;

create function pg_temp.check(label text, ok boolean) returns text language sql as $$ select case when ok then 'PASS ' else 'FAIL ' end || label $$;

-- ---------- anonymous visitor
set role anon; set request.jwt.claims = '{}';
select pg_temp.check('anon sees only live and sold properties', (select array_agg(slug order by slug) from public.properties) = array['gone', 'pub']);
select pg_temp.check('anon sees only published products', (select count(*) from public.products) = 1);
select pg_temp.check('anon cannot read staff', not has_table_privilege('anon', 'public.staff', 'select'));
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
set role authenticated; set request.jwt.claims = '{"email":"Editor@ASMS.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
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
set role authenticated; set request.jwt.claims = '{"email":"owner@asms.test","sub":"00000000-0000-0000-0000-0000000000a1"}';
insert into public.staff (email, name, role) values ('staff2@asms.test', 'Staff Two', 'editor');
select pg_temp.check('owner adds staff', (select count(*) from public.staff) = 3);
delete from public.staff where email = 'owner@asms.test';
reset role;
select pg_temp.check('last owner cannot be removed', (select count(*) from public.staff where role = 'owner') = 1);

-- ---------- a staff email is not enough on its own
-- staff2 was added to the staff list, but this account has not confirmed the address yet.
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-00000000000c', 'staff2@asms.test');
set role authenticated; set request.jwt.claims = '{"email":"staff2@asms.test","sub":"cccccccc-0000-0000-0000-00000000000c"}';
select pg_temp.check('unconfirmed account with a staff email is not staff', not public.is_staff() and not exists (select 1 from public.properties where stage = 'draft'));
-- A token naming a staff email for some other account does not make it staff.
set request.jwt.claims = '{"email":"owner@asms.test","sub":"cccccccc-0000-0000-0000-00000000000c"}';
select pg_temp.check('email claim alone does not make an owner', not public.is_owner() and not public.is_staff());
reset role;

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
select pg_temp.check('anon cannot read enquiries back', not has_table_privilege('anon', 'public.enquiries', 'select'));
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

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
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
select pg_temp.check('visitors cannot read history', not has_table_privilege('anon', 'public.enquiry_history', 'select'));
reset role;

set role anon; set request.jwt.claims = '{}';
insert into public.enquiries (kind, name, phone, message, consent) values ('general', 'Repeat', '+91 98400 12345', 'three', true);
insert into public.enquiries (kind, name, phone, message, consent) values ('general', 'Repeat', '+91 98400 12345', 'four', true);
reset role;
select pg_temp.check('fourth enquiry in an hour from one phone is refused', (select count(*) from public.enquiries where phone = '+91 98400 12345') = 3);

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
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
select pg_temp.check('visitors cannot read events', not has_table_privilege('anon', 'public.events', 'select'));
reset role;
select pg_temp.check('track records live views and clicks only, deduped per browser', (select count(*) from public.events) = 3
  and (select count(*) from public.events where type = 'property_view') = 2 and (select count(distinct visitor) from public.events) = 2);
select pg_temp.check('events trigger no rebuild', (select count(*) from net.calls) = 0);
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
select public.track('property_view', 'R-1', '00000000-0000-0000-0000-000000000009', 'detail');  -- staff browsing: ignored
select pg_temp.check('staff read events', (select count(*) from public.events) = 3);
reset role;

-- ---------- seller portal
insert into auth.users values ('aaaaaaaa-0000-0000-0000-00000000000a'), ('bbbbbbbb-0000-0000-0000-00000000000b');
truncate net.calls;

-- Asha signs in with Google but has no profile yet: she cannot list anything.
set role authenticated; set request.jwt.claims = '{"email":"Asha@Gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
insert into public.properties (title) values ('Too early');
insert into public.seller_profiles (user_id, email, name, phone, seller_type, status)
  values ('bbbbbbbb-0000-0000-0000-00000000000b', 'someone@else.com', 'Asha', '98400 55555', 'owner', 'suspended');
reset role;
select pg_temp.check('no profile, no listing', (select count(*) from public.properties where title = 'Too early') = 0);
select pg_temp.check('profile is always her own, active, with her sign-in email',
  (select user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and email = 'asha@gmail.com' and status = 'active' from public.seller_profiles));

-- She starts a draft and tries to set staff-only fields.
set role authenticated; set request.jwt.claims = '{"email":"asha@gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
insert into public.properties (id, slug, reference, title, stage, featured, location)
  values ('cccccccc-0000-0000-0000-00000000000c', 'hack', 'HACK-1', 'Corner plot in Porur', 'live', true, 'Porur, Chennai');
select pg_temp.check('seller sees her own draft', (select count(*) from public.properties where seller_id = auth.uid()) = 1);
update public.properties set title = 'East-facing corner plot in Porur', stage = 'live', featured = true, reference = 'X' where id = 'cccccccc-0000-0000-0000-00000000000c';
select public.submit_listing('cccccccc-0000-0000-0000-00000000000c');  -- incomplete: refused
reset role;
select pg_temp.check('seller draft gets a generated reference and stays a draft, not featured',
  (select reference ~ '^ASMS-S[0-9]{4}$' and slug = lower(reference) and stage = 'draft' and not featured and title = 'East-facing corner plot in Porur' and seller_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
   from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c'));
select pg_temp.check('an incomplete listing cannot be submitted', (select stage from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 'draft');
select pg_temp.check('seller drafts start no rebuild', (select count(*) from net.calls) = 0);

set role anon; set request.jwt.claims = '{}';
select pg_temp.check('visitors cannot see seller drafts', (select count(*) from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 0);
reset role;

-- Bala, another seller, cannot see or touch it.
insert into public.seller_profiles (user_id, email, name, phone, seller_type) values ('bbbbbbbb-0000-0000-0000-00000000000b', 'bala@gmail.com', 'Bala', '98400 66666', 'broker');
set role authenticated; set request.jwt.claims = '{"email":"bala@gmail.com","sub":"bbbbbbbb-0000-0000-0000-00000000000b"}';
select pg_temp.check('another seller cannot see it', (select count(*) from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 0);
update public.properties set title = 'stolen' where id = 'cccccccc-0000-0000-0000-00000000000c';
select public.submit_listing('cccccccc-0000-0000-0000-00000000000c');
insert into storage.objects (bucket_id, name) values ('seller-docs', 'aaaaaaaa-0000-0000-0000-00000000000a/cccccccc/x.pdf');
insert into public.seller_documents (property_id, seller_id, label, path) values ('cccccccc-0000-0000-0000-00000000000c', 'bbbbbbbb-0000-0000-0000-00000000000b', 'Patta', 'bbbbbbbb-0000-0000-0000-00000000000b/x.pdf');
reset role;

-- Photo paths: the build copies each one to public/media/<path>, so only plain
-- storage keys are accepted, and a seller may only add photos they uploaded.
set role authenticated; set request.jwt.claims = '{"email":"bala@gmail.com","sub":"bbbbbbbb-0000-0000-0000-00000000000b"}';
insert into public.properties (id, title, images) values ('dddddddd-0000-0000-0000-000000000001', 'Escape', '[{"path":"sellers/bbbbbbbb-0000-0000-0000-00000000000b/../../../app/x.webp","alt":""}]');
insert into public.properties (id, title, images) values ('dddddddd-0000-0000-0000-000000000002', 'Borrowed', '[{"path":"sellers/aaaaaaaa-0000-0000-0000-00000000000a/1.webp","alt":""}]');
insert into public.properties (id, title, images) values ('dddddddd-0000-0000-0000-000000000003', 'Own photo', '[{"path":"sellers/bbbbbbbb-0000-0000-0000-00000000000b/1.webp","alt":""}]');
reset role;
select pg_temp.check('seller photo path with .. refused', not exists (select 1 from public.properties where id = 'dddddddd-0000-0000-0000-000000000001'));
select pg_temp.check('seller cannot use another seller''s photo', not exists (select 1 from public.properties where id = 'dddddddd-0000-0000-0000-000000000002'));
select pg_temp.check('seller can use own uploaded photo', exists (select 1 from public.properties where id = 'dddddddd-0000-0000-0000-000000000003'));
delete from public.properties where id = 'dddddddd-0000-0000-0000-000000000003';
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
insert into public.properties (slug, reference, title, images) values ('abs', 'R-ABS', 'x', '[{"path":"/etc/passwd.png","alt":""}]');
update public.products set image_path = '../public/.htaccess.png' where slug = 'aac-blocks';
reset role;
select pg_temp.check('staff cannot store unsafe photo paths either',
  not exists (select 1 from public.properties where reference = 'R-ABS') and (select image_path is null from public.products where slug = 'aac-blocks'));
select pg_temp.check('another seller changed nothing', (select title from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 'East-facing corner plot in Porur'
  and (select count(*) from storage.objects where bucket_id = 'seller-docs') = 0 and (select count(*) from public.seller_documents) = 0);

-- Asha completes it, uploads a private document and submits.
set role authenticated; set request.jwt.claims = '{"email":"asha@gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
update public.properties set area_sqft = 2400, price = 9600000, description = 'A 2,400 sq ft corner plot on a 30 ft road, five minutes from Porur junction.',
  images = '[{"path":"sellers/aaaaaaaa-0000-0000-0000-00000000000a/1.webp","alt":""},{"path":"sellers/aaaaaaaa-0000-0000-0000-00000000000a/2.webp","alt":""},{"path":"sellers/aaaaaaaa-0000-0000-0000-00000000000a/3.webp","alt":""}]'
  where id = 'cccccccc-0000-0000-0000-00000000000c';
insert into storage.objects (bucket_id, name) values ('media', 'sellers/aaaaaaaa-0000-0000-0000-00000000000a/1.webp');
insert into storage.objects (bucket_id, name) values ('media', 'properties/not-mine.webp');
insert into storage.objects (bucket_id, name) values ('seller-docs', 'aaaaaaaa-0000-0000-0000-00000000000a/cccccccc/patta.pdf');
insert into public.seller_documents (property_id, seller_id, label, path, file_name) values ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Patta', 'aaaaaaaa-0000-0000-0000-00000000000a/cccccccc/patta.pdf', 'patta.pdf');
select public.submit_listing('cccccccc-0000-0000-0000-00000000000c');
update public.properties set title = 'Changed after submitting' where id = 'cccccccc-0000-0000-0000-00000000000c';
select public.review_listing('cccccccc-0000-0000-0000-00000000000c', 'approve');
reset role;
select pg_temp.check('seller uploads photos and documents only into her own folders',
  (select array_agg(bucket_id || ':' || name order by name) from storage.objects where name like 'aaaa%' or name like 'sellers/%' or name = 'properties/not-mine.webp')
  = array['seller-docs:aaaaaaaa-0000-0000-0000-00000000000a/cccccccc/patta.pdf', 'media:sellers/aaaaaaaa-0000-0000-0000-00000000000a/1.webp']);
select pg_temp.check('complete listing is submitted and then locked', (select stage = 'submitted' and submitted_at is not null and title = 'East-facing corner plot in Porur' from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c'));
select pg_temp.check('a seller cannot approve her own listing', (select stage from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 'submitted');

set role anon; set request.jwt.claims = '{}';
select pg_temp.check('visitors cannot read private documents', not has_table_privilege('anon', 'public.seller_documents', 'select') and (select count(*) from storage.objects where bucket_id = 'seller-docs') = 0);
reset role;

-- Staff review: changes need a note; the seller fixes and resubmits; staff approve.
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
select pg_temp.check('staff see the document', (select count(*) from public.seller_documents) = 1 and (select count(*) from storage.objects where bucket_id = 'seller-docs') = 1);
select public.review_listing('cccccccc-0000-0000-0000-00000000000c', 'start');
select public.review_listing('cccccccc-0000-0000-0000-00000000000c', 'changes');  -- no note: refused
select pg_temp.check('requesting changes needs a note', (select stage from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 'under_review');
select public.review_listing('cccccccc-0000-0000-0000-00000000000c', 'changes', 'Please add a photo of the road frontage.');
reset role;
select pg_temp.check('changes requested with the note for the seller', (select stage = 'changes_requested' and review_note = 'Please add a photo of the road frontage.' from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c'));

set role authenticated; set request.jwt.claims = '{"email":"asha@gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
select pg_temp.check('seller sees the history with the note, not who reviewed it',
  (select count(*) from public.listing_history('cccccccc-0000-0000-0000-00000000000c') where note = 'Please add a photo of the road frontage.' and not by_seller) = 1);
select pg_temp.check('seller cannot read the audit log directly', (select count(*) from public.audit_log) = 0);
update public.properties set images = images || '[{"path":"sellers/aaaaaaaa-0000-0000-0000-00000000000a/4.webp","alt":"Road frontage"}]' where id = 'cccccccc-0000-0000-0000-00000000000c';
select public.submit_listing('cccccccc-0000-0000-0000-00000000000c');
reset role;
select pg_temp.check('corrected listing resubmitted', (select stage = 'submitted' and jsonb_array_length(images) = 4 from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c'));
select pg_temp.check('review steps start no rebuild', (select count(*) from net.calls) = 0);

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
select public.review_listing('cccccccc-0000-0000-0000-00000000000c', 'approve');
reset role;
select pg_temp.check('approved listing goes live with a web address and dates, note cleared',
  (select stage = 'live' and slug = 'east-facing-corner-plot-in-porur-' || lower(reference) and posted_on = current_date and last_confirmed_on = current_date and review_note is null
   from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c'));
select pg_temp.check('going live starts one rebuild', (select count(*) from net.calls) = 1);
set role anon; set request.jwt.claims = '{}';
select pg_temp.check('visitors now see it', (select count(*) from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 1);
reset role;

-- Live edits wait for review.
set role authenticated; set request.jwt.claims = '{"email":"asha@gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
update public.properties set price = 1 where id = 'cccccccc-0000-0000-0000-00000000000c';
select public.submit_revision('cccccccc-0000-0000-0000-00000000000c', '{"price": 9200000, "featured": true, "stage": "sold"}');
select public.submit_revision('cccccccc-0000-0000-0000-00000000000c', '{"price": 9100000, "price_negotiable": true}');
reset role;
select pg_temp.check('seller cannot edit a live listing directly', (select price from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 9600000);
select pg_temp.check('a new change request replaces the pending one and keeps only seller fields',
  (select count(*) from public.property_revisions where status = 'pending') = 1
  and (select changes = '{"price": 9100000, "price_negotiable": true}'::jsonb from public.property_revisions where status = 'pending')
  and (select count(*) from public.property_revisions where status = 'withdrawn') = 1);

set role authenticated; set request.jwt.claims = '{"email":"bala@gmail.com","sub":"bbbbbbbb-0000-0000-0000-00000000000b"}';
select public.review_revision((select id from public.property_revisions where status = 'pending'), 'approve');
reset role;
select pg_temp.check('a seller cannot approve a change request', (select count(*) from public.property_revisions where status = 'pending') = 1);
set role authenticated; set request.jwt.claims = '{"email":"asha@gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
select public.submit_revision('cccccccc-0000-0000-0000-00000000000c', '{"images": [{"path":"sellers/bbbbbbbb-0000-0000-0000-00000000000b/1.webp","alt":""},{"path":"sellers/bbbbbbbb-0000-0000-0000-00000000000b/2.webp","alt":""},{"path":"sellers/bbbbbbbb-0000-0000-0000-00000000000b/3.webp","alt":""}]}');
reset role;
select pg_temp.check('a change request cannot bring in another seller''s photos',
  (select changes = '{"price": 9100000, "price_negotiable": true}'::jsonb from public.property_revisions where status = 'pending'));

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
select public.review_revision((select id from public.property_revisions where status = 'pending'), 'approve');
reset role;
select pg_temp.check('approved change request is applied', (select price = 9100000 and price_negotiable and stage = 'live' from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c')
  and (select status = 'approved' and reviewed_by = 'editor@asms.test' from public.property_revisions where changes ? 'price_negotiable'));

-- Seller status actions.
set role authenticated; set request.jwt.claims = '{"email":"asha@gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
select public.seller_listing_action('cccccccc-0000-0000-0000-00000000000c', 'resume');  -- not paused: refused
select public.seller_listing_action('cccccccc-0000-0000-0000-00000000000c', 'pause');
reset role;
select pg_temp.check('seller pauses her live listing', (select stage from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 'paused');
set role authenticated; set request.jwt.claims = '{"email":"asha@gmail.com","sub":"aaaaaaaa-0000-0000-0000-00000000000a"}';
select public.seller_listing_action('cccccccc-0000-0000-0000-00000000000c', 'sold');
reset role;
select pg_temp.check('seller marks it sold', (select stage from public.properties where id = 'cccccccc-0000-0000-0000-00000000000c') = 'sold');

-- Suspension stops new listings.
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
update public.seller_profiles set status = 'suspended' where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
reset role;
set role authenticated; set request.jwt.claims = '{"email":"bala@gmail.com","sub":"bbbbbbbb-0000-0000-0000-00000000000b"}';
update public.seller_profiles set status = 'active';
insert into public.properties (title) values ('Suspended seller listing');
reset role;
select pg_temp.check('a suspended seller cannot reactivate himself or add listings',
  (select status from public.seller_profiles where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b') = 'suspended'
  and (select count(*) from public.properties where title = 'Suspended seller listing') = 0);
select pg_temp.check('audit log records stages, the change request and the suspension',
  (select count(*) from public.audit_log where property_id = 'cccccccc-0000-0000-0000-00000000000c' and action = 'stage') = 7
  and (select count(*) from public.audit_log where action in ('revision_submitted', 'revision_approved')) = 3
  and (select count(*) from public.audit_log where action = 'seller_status' and actor = 'editor@asms.test') = 1);

-- ---------- product photo credits
update public.products set image_path = 'products/a.webp', image_credit = '{"artist":"Someone","license":"CC BY 4.0"}' where slug = 'paver-blocks';
select pg_temp.check('a photo can carry its credit', (select image_credit ->> 'artist' = 'Someone' from public.products where slug = 'paver-blocks'));
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
update public.products set image_path = 'products/b.webp' where slug = 'paver-blocks';
reset role;
select pg_temp.check('replacing the photo clears the old credit', (select image_credit is null from public.products where slug = 'paver-blocks'));

-- ---------- event offer registrations
update public.promo_events set opens_at = now() + interval '1 hour', closes_at = now() + interval '2 hours' where slug = 'nov-21-2026';
set role anon; set request.jwt.claims = '{}';
select public.register_for_event('nov-21-2026', 'Early Bird', null, '9840012345');
reset role;
select pg_temp.check('event: registering before it opens is refused', (select count(*) from public.event_registrations) = 0);
update public.promo_events set opens_at = now() - interval '1 hour', closes_at = now() + interval '1 hour' where slug = 'nov-21-2026';
set role anon; set request.jwt.claims = '{}';
select pg_temp.check('event: a visitor registers without signing in and gets an ID',
  public.register_for_event('nov-21-2026', '  Ravi   Kumar ', 'Kumar Realty', '+91 98400 12345', 'qr') = 'ASMS-EV-0001');
select public.register_for_event('nov-21-2026', 'Ravi Again', null, '098400-12345', 'popup');  -- same number, other format
select public.register_for_event('nov-21-2026', 'Bad Number', null, '12345', 'page');
select public.register_for_event('nov-21-2026', 'X', null, '9840099999', 'page');            -- name too short
select public.register_for_event('no-such-event', 'Someone', null, '9840011111', 'page');
select pg_temp.check('event: visitors cannot read registrations', not has_table_privilege('anon', 'public.event_registrations', 'select'));
select public.track_event_activity('nov-21-2026', 'view', '00000000-0000-0000-0000-0000000000e1');
select public.track_event_activity('nov-21-2026', 'view', '00000000-0000-0000-0000-0000000000e1');  -- repeat: ignored
select public.track_event_activity('nov-21-2026', 'qr_scan', '00000000-0000-0000-0000-0000000000e1');
select public.track_event_activity('nov-21-2026', 'hack', '00000000-0000-0000-0000-0000000000e1');
select pg_temp.check('event: visitors get no funnel numbers', not has_function_privilege('anon', 'public.event_funnel(text)', 'execute'));
reset role;
select pg_temp.check('event: one registration per WhatsApp number, stored as 91 + 10 digits, name tidied',
  (select count(*) from public.event_registrations) = 1
  and (select whatsapp = '919840012345' and name = 'Ravi Kumar' and source = 'qr' from public.event_registrations));
select pg_temp.check('event: invalid numbers, short names and unknown events are refused', (select count(*) from public.event_registrations) = 1);
update public.promo_events set closes_at = now() - interval '1 minute' where slug = 'nov-21-2026';
set role anon; set request.jwt.claims = '{}';
select public.register_for_event('nov-21-2026', 'Late Comer', null, '9840022222', 'page');
reset role;
select pg_temp.check('event: registering after it closes is refused', (select count(*) from public.event_registrations) = 1);
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
select pg_temp.check('event: staff read registrations and the funnel',
  (select count(*) from public.event_registrations) = 1
  and (select views = 1 and qr_scans = 1 and form_starts = 0 and registrations = 1 from public.event_funnel('nov-21-2026')));
reset role;
set role anon; set request.jwt.claims = '{}';
delete from public.event_registrations;
reset role;
select pg_temp.check('event: visitors cannot delete registrations', (select count(*) from public.event_registrations) = 1);
set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test","sub":"00000000-0000-0000-0000-0000000000a2"}';
delete from public.event_registrations where code = 'ASMS-EV-0001';
reset role;
select pg_temp.check('event: staff can delete a test or spam registration', (select count(*) from public.event_registrations) = 0);
