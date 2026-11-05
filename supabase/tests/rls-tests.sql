-- Each block runs as a role with a JWT email and prints PASS/FAIL lines.
\set ON_ERROR_STOP 0
\pset tuples_only on
\pset format unaligned

-- setup as superuser
insert into public.staff (email, role) values ('owner@asms.test', 'owner'), ('editor@asms.test', 'editor');
insert into public.properties (slug, reference, title, published) values ('pub', 'R-1', 'Published', true), ('draft', 'R-2', 'Draft', false);
update public.products set published = true where slug = 'aac-blocks';
insert into vault.decrypted_secrets values ('github_dispatch_token', 'tok'), ('github_repo', 'Dentrebair/asms-re');
truncate net.calls;

create function pg_temp.check(label text, ok boolean) returns text language sql as $$ select case when ok then 'PASS ' else 'FAIL ' end || label $$;

-- ---------- anonymous visitor
set role anon; set request.jwt.claims = '{}';
select pg_temp.check('anon sees only published properties', (select array_agg(slug) from public.properties) = array['pub']);
select pg_temp.check('anon sees only published products', (select count(*) from public.products) = 1);
select pg_temp.check('anon cannot read staff', (select count(*) from public.staff) = 0);
update public.properties set title = 'hacked'; delete from public.products;
insert into public.properties (slug, reference, title) values ('x', 'X', 'x');
insert into storage.objects (bucket_id, name) values ('media', 'evil.webp');
select public.request_site_rebuild();
reset role;
select pg_temp.check('anon changed nothing', (select count(*) from public.properties where title = 'hacked') = 0 and (select count(*) from public.products) = 12 and (select count(*) from public.properties) = 2 and (select count(*) from storage.objects) = 0);

-- ---------- signed-in stranger (not on staff list)
set role authenticated; set request.jwt.claims = '{"email":"stranger@gmail.com"}';
select pg_temp.check('stranger sees only published', (select count(*) from public.properties) = 1);
update public.properties set title = 'hacked'; delete from public.properties;
insert into public.staff (email, role) values ('stranger@gmail.com', 'owner');
insert into storage.objects (bucket_id, name) values ('media', 'evil.webp');
select public.request_site_rebuild();
reset role;
select pg_temp.check('stranger changed nothing', (select count(*) from public.properties) = 2 and (select count(*) from public.staff) = 2 and (select count(*) from storage.objects) = 0);
select pg_temp.check('blocked writes sent no rebuilds', (select count(*) from net.calls) = 0);

-- ---------- editor
set role authenticated; set request.jwt.claims = '{"email":"Editor@ASMS.test"}';
select pg_temp.check('editor sees drafts too', (select count(*) from public.properties) = 2);
insert into public.properties (slug, reference, title, published, price, area_sqft) values ('new-plot', 'R-3', 'New plot', true, 4800000, 1200);
update public.products set published = true where category_id = 'roofing';
insert into storage.objects (bucket_id, name) values ('media', 'properties/a.webp');
insert into storage.objects (bucket_id, name) values ('other-bucket', 'x.webp');
insert into public.staff (email, role) values ('friend@gmail.com', 'owner');
select public.request_site_rebuild();
reset role;
select pg_temp.check('editor wrote content', (select count(*) from public.properties) = 3 and (select count(*) from public.products where published) = 4);
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
select pg_temp.check('bad slug / negative price / uppercase email rejected', (select count(*) from public.properties where reference in ('R-9','R-10')) = 0 and (select count(*) from public.staff where email ilike 'notlower%') = 0);
