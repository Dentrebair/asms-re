# ASMS–ROUNAQH website

Marketing site for ASMS–ROUNAQH (real estate, construction products and
services), built with [vinext](https://github.com/cloudflare/vinext) (Next.js
App Router on Vite) and deployable to Cloudflare Workers.

## Prerequisites

- Node.js `>=22.13.0`

## Commands

```bash
npm install
npm run dev     # local dev server
npm run build   # production build into dist/
npm test        # build the static site and check every exported page
npm run lint
npm run test:db     # check the Supabase schema + security rules (needs local Postgres)
npm run test:admin  # browser test of /admin against a fake Supabase (needs Chrome)
npm run test:browser  # browser test of the public catalogue pages (needs Chrome)
npm run test:seller   # seller portal and review queue end to end, on the demo server (needs Chrome)
npm run demo        # the whole site, admin and seller portal on a fake Supabase: http://localhost:54401
npm run content:pull  # fetch published content + photos from Supabase
```

## Layout

- `app/` — pages (`/`, `/properties`, `/properties/[slug]`, `/products`, `/contact`) and shared UI in `app/site-components.tsx`
- `app/admin/` — staff admin panel (`/admin`): properties, products, photos, staff
- `content/content.json` — site content. Committed file = sample data; the deploy replaces it with published Supabase content (`scripts/pull-content.mjs`)
- `supabase/` — database schema, security rules, setup guide ([supabase/README.md](supabase/README.md))
- `app/globals.css` — styles; design direction in `DESIGN.md`
- `worker/index.ts` — Cloudflare Worker entry

## Deploying to Hostinger

The site builds to plain static files (`output: "export"` in `next.config.ts`),
so it runs on any Hostinger plan. `npm run build` writes them to `dist/client/`,
including `public/.htaccess` (clean URLs, HTTPS redirect, caching, gzip).

Content (properties, products, photos) is managed in `/admin` and stored in
Supabase — set that up first: [supabase/README.md](supabase/README.md).

Every push to `main`, every content change in `/admin`, and a twice-weekly schedule run `.github/workflows/deploy-hostinger.yml`, which pulls content,
builds, tests and uploads `dist/client/` to Hostinger over FTP. One-time setup:

1. hPanel → **Files → FTP Accounts**: create a dedicated FTP account whose
   directory is `public_html` (the deploy uploads to that account's root).
2. Add its details as GitHub Actions secrets `HOSTINGER_FTP_SERVER`,
   `HOSTINGER_FTP_USERNAME` and `HOSTINGER_FTP_PASSWORD`
   (e.g. `gh secret set HOSTINGER_FTP_PASSWORD` prompts without echoing).
3. Push to `main` or run the workflow from the **Actions** tab.

The contact form is a front-end demo only; it doesn't send email yet.
