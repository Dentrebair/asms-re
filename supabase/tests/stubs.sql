-- Minimal stand-ins for Supabase's auth, storage, vault and pg_net so the
-- schema and its RLS policies can be exercised on plain Postgres.
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
grant usage on schema auth to anon, authenticated; grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create schema vault; create table vault.decrypted_secrets (name text, decrypted_secret text);
create schema net; create table net.calls (url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
language sql as $$ insert into net.calls values (url, body, headers); select 1::bigint $$;
grant usage on schema storage, public to anon, authenticated;
grant all on storage.objects to anon, authenticated;
-- New Supabase projects no longer grant anon/authenticated access to new tables or
-- functions automatically, so the stand-in grants nothing either: schema.sql must
-- grant every privilege it relies on, and these tests prove it does.
alter default privileges in schema public revoke execute on functions from public;
create schema private;
alter default privileges in schema private revoke execute on functions from public;
