#!/usr/bin/env bash
# Browser checks of the public pages (catalogue, filters, URL state, sold pages).
# Needs Google Chrome installed. Usage: npm run test:browser
set -euo pipefail
cd "$(dirname "$0")/../.."
work="$(mktemp -d /tmp/asms-browser.XXXX)"
trap 'kill $server 2>/dev/null || true; rm -rf "$work"' EXIT
npm run build >/dev/null
node tests/admin-e2e/mock-backend.mjs "$PWD/dist/client" "$PWD/public/products/tmt.webp" >"$work/server.log" 2>&1 & server=$!
sleep 1
node tests/browser/catalog.mjs "$work"
