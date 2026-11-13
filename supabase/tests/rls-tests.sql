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
insert into public.enquiries (name, phone, email, category, interest, message, consent)
  values ('  Priya  ', '+91 98400 12345', ' Priya@Example.COM ', 'Property purchase', 'ASMS-0001', 'Is the plot still available?', true);
select pg_temp.check('anon cannot read enquiries back', (select count(*) from public.enquiries) = 0);
insert into public.enquiries (name, phone, category, message, consent, status) values ('Sneaky', '9840012345', 'General enquiry', 'x', true, 'closed');
insert into public.enquiries (name, phone, category, message, consent) values ('No consent', '9840012346', 'General enquiry', 'x', false);
insert into public.enquiries (name, phone, category, message, consent) values ('Bad phone', 'call me', 'General enquiry', 'x', true);
insert into public.enquiries (name, phone, category, message, consent) values ('Bad category', '9840012347', 'Loans', 'x', true);
update public.enquiries set status = 'closed'; delete from public.enquiries;
reset role;
select pg_temp.check('anon enquiry saved and tidied', (select count(*) from public.enquiries) = 1
  and (select name = 'Priya' and email = 'priya@example.com' and status = 'new' from public.enquiries));
select pg_temp.check('anon cannot set status, skip consent, or send bad phone/category', (select count(*) from public.enquiries) = 1);
select pg_temp.check('anon cannot change or delete enquiries', (select status from public.enquiries) = 'new');
select pg_temp.check('enquiry sends one email alert, no rebuild', (select count(*) from net.calls) = 1
  and (select bool_and(url = 'https://api.resend.com/emails' and headers ->> 'Authorization' = 'Bearer re_test'
       and body -> 'to' = '["sales@asms.test","owner@asms.test"]'::jsonb and body ->> 'subject' = 'New enquiry: Property purchase from Priya') from net.calls));

set role authenticated; set request.jwt.claims = '{"email":"stranger@gmail.com"}';
select pg_temp.check('stranger cannot read enquiries', (select count(*) from public.enquiries) = 0);
update public.enquiries set status = 'closed';
reset role;
select pg_temp.check('stranger changed nothing on enquiries', (select status from public.enquiries) = 'new');

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test"}';
select pg_temp.check('staff read enquiries', (select count(*) from public.enquiries) = 1);
update public.enquiries set status = 'contacted', notes = 'Called, site visit Saturday';
update public.enquiries set message = 'rewritten';
reset role;
select pg_temp.check('staff update status and notes but not the message', (select status = 'contacted' and notes = 'Called, site visit Saturday' and message = 'Is the plot still available?' from public.enquiries));

set role anon; set request.jwt.claims = '{}';
insert into public.enquiries (name, phone, category, message, consent) values ('Repeat', '+91 98400 12345', 'General enquiry', 'two', true);
insert into public.enquiries (name, phone, category, message, consent) values ('Repeat', '+91 98400 12345', 'General enquiry', 'three', true);
insert into public.enquiries (name, phone, category, message, consent) values ('Repeat', '+91 98400 12345', 'General enquiry', 'four', true);
reset role;
select pg_temp.check('fourth enquiry in an hour from one phone is refused', (select count(*) from public.enquiries) = 3);

set role authenticated; set request.jwt.claims = '{"email":"editor@asms.test"}';
delete from public.enquiries where message = 'three';
reset role;
select pg_temp.check('staff delete an enquiry', (select count(*) from public.enquiries) = 2);
