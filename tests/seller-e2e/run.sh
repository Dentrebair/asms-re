#!/usr/bin/env bash
# Browser test of the seller portal and the admin review queue, end to end, against the
# local demo server (fake Supabase and fake Google sign-in) with throwaway data.
# Needs Google Chrome installed (macOS path in drive.mjs). Usage: npm run test:seller
set -euo pipefail
cd "$(dirname "$0")/../.."
work="$(mktemp -d /tmp/asms-seller.XXXX)"
trap 'kill $server 2>/dev/null || true; wait $server 2>/dev/null || true; [ -n "${KEEP_SHOTS:-}" ] && cp "$work"/*.png "$KEEP_SHOTS"/ 2>/dev/null; rm -rf "$work"' EXIT
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54401 NEXT_PUBLIC_SUPABASE_ANON_KEY=demo-anon-key npm run build >/dev/null
printf '%%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n' > "$work/patta.pdf"
DEMO_DIR="$work/demo" DEMO_NO_BUILD=1 node scripts/demo-server.mjs >"$work/server.log" 2>&1 & server=$!
sleep 1
node tests/seller-e2e/drive.mjs "$work" "$PWD/public/asms-hero.webp" "$work/patta.pdf" || { echo "--- demo server log"; tail -30 "$work/server.log"; exit 1; }
