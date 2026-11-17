#!/usr/bin/env bash
# Applies supabase/schema.sql to a throwaway local Postgres (with stand-ins for
# Supabase's auth/storage/vault/pg_net) and runs the RLS checks.
# Needs a local Postgres install (initdb, pg_ctl, psql). Usage: supabase/tests/run.sh
set -euo pipefail
export LC_ALL=C LANG=C
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d /tmp/asms-pg.XXXX)"
trap 'pg_ctl -D "$work/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
initdb -D "$work/data" -U postgres -A trust --locale=C -E UTF8 >/dev/null
pg_ctl -D "$work/data" -o "-p 54330 -k $work -c listen_addresses=''" -l "$work/log" -w start >/dev/null
psql_() { psql -h "$work" -p 54330 -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql_ -f "$here/stubs.sql"
grep -v "create extension if not exists pg_net" "$here/../schema.sql" > "$work/schema.sql"
psql_ -f "$work/schema.sql" 2>/dev/null
psql_ -f "$work/schema.sql" 2>/dev/null   # must be re-runnable
out="$(psql -h "$work" -p 54330 -U postgres -d postgres -q -f "$here/rls-tests.sql" 2>"${RLS_ERR:-/dev/null}" | grep -E '^(PASS|FAIL)')"
echo "$out"
# A check whose query errors prints nothing, so count them too.
expected="$(grep -c "pg_temp.check('" "$here/rls-tests.sql")"
got="$(grep -c '^PASS' <<<"$out" || true)"
[ "$got" = "$expected" ] || { echo "Only $got of $expected checks passed"; exit 1; }
