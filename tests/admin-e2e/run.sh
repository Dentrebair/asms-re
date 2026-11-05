#!/usr/bin/env bash
# Browser test of the admin panel against a fake Supabase (auth, database, storage).
# Needs Google Chrome installed (macOS path in drive.mjs). Usage: npm run test:admin
set -euo pipefail
cd "$(dirname "$0")/../.."
work="$(mktemp -d /tmp/asms-e2e.XXXX)"
trap 'kill $mock 2>/dev/null || true; rm -rf "$work"' EXIT
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54401 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-test npm run build >/dev/null
node tests/admin-e2e/mock-backend.mjs "$PWD/dist/client" "$PWD/public/products/tmt.webp" >"$work/mock.log" 2>&1 & mock=$!
sleep 1
node tests/admin-e2e/drive.mjs "$work" "$PWD/public/asms-hero.webp"
