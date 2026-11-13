# PRD v1.0 delivery plan

How the current site maps to the PRD (*ASMS–ROUNAQH PRD v1.0, 13 Nov 2026*), and the
order the rest gets built. Section numbers (§) refer to the PRD.

## Architecture (unchanged)

- **Public pages** (`/`, `/properties`, `/properties/[slug]`, `/products`, `/products/[slug]`,
  company and legal pages) stay pre-built static HTML on Hostinger. They are fast and
  easy for search engines to index (§6 SEO, §18 performance). A listing goes live when an
  admin approves it; that change starts a rebuild, which takes about 3 minutes.
- **Account pages** (`/saved`, `/account`, `/seller/*`, `/admin/*`) are static shells that
  load their data in the browser from Supabase after sign-in.
- **Supabase** holds every rule (§16: "apply permissions on the server and data layer").
  Row-level security, column grants and Postgres functions enforce access. Hiding a
  button is never the only guard.
- Supabase Auth covers all three sign-in methods: buyer phone OTP (§22), seller
  Google or email magic link (§9), and staff password.

## Gap analysis

| PRD area | Now | Gap |
|---|---|---|
| §4 Routes | `/`, `/properties`, `/properties/[slug]`, `/products`, `/contact`, `/privacy`, `/admin` | `/saved`, `/account`, `/sell`, `/seller/*`, admin sub-areas, `/products/[slug]`, `/about`, `/services`, `/projects`, `/terms`, `/disclaimer` |
| §5 Design | Locked brand system (DESIGN.md); 3×2 cards | Save heart on cards, 16:10 photos, mobile sticky Enquire / WhatsApp bar, mobile filter drawer. Brand colours stay (the PRD's palette is only "proposed") |
| §6 Discovery | Location / type / budget / area filters, sort, pager | Type tabs with type-specific filters, keyword search, filters kept in the URL, area units, Area sort, share, WhatsApp CTA, sitemap and Open Graph tags |
| §7 Detail page | Gallery, facts, documents, nearby, EMI, enquiry | Specs that change by type, last-confirmed date, site visit request, WhatsApp CTA (tracked), share, Sold / unavailable state |
| §8 Buyer account | None | WhatsApp OTP sign-in, wishlist, `/saved`, `/account` |
| §9–11 Seller | None | Seller sign-in, wizard, private documents, review lifecycle, live-edit revisions, seller dashboard |
| §12 Admin | Properties, products, staff, enquiries inbox (new / contacted / closed) | Overview, submissions queue, full lead statuses, assignment, follow-up dates, audit log, analytics, seller management |
| §13 Products | Catalogue with filter, quote via contact form | Product detail pages, quote form (organisation, quantity, location); enquiry type *Product* |
| §14 Events | None | First-party events: views (≥3 s), unique viewers, saves, enquiries, visit requests, WhatsApp clicks, shares |
| §15–16 Data / roles | staff, properties, products, categories, enquiries | users and roles, seller profiles, property stage and type fields, revisions, media visibility, wishlist, visit requests, events, daily metrics, audit |

## Phases

**Phase 1: no outside accounts needed** (done 13 Nov 2026, commits 845b073 to 2baa609, except `/about` and `/services`, which wait for ASMS wording)

1. Data model v2:
   - property category with type-specific fields
   - listing stage (§11) in place of the published flag
   - last-confirmed date, area units, price display choice
2. `/properties`:
   - type tabs (All, Apartments/Houses, Plots/Land, Commercial, Agricultural if stocked)
   - filters that change with the type
   - keyword search
   - filters kept in the URL
   - Area sort
   - Sold listings left out of search
3. Detail page:
   - specs that change by type
   - last confirmed date
   - site visit request
   - WhatsApp CTA with click tracking
   - share
   - Sold state with enquiries disabled
   - mobile sticky action bar
4. Enquiries v2:
   - property ID, kind (property / product / visit / general), source
   - lead statuses from §12, assigned staff, follow-up date
   - timestamped history
5. Events:
   - first-party `events` table, written through a rate-limited function
   - views after 3 s, WhatsApp clicks, shares
   - bots and staff filtered out
6. Products:
   - `/products/[slug]` detail pages
   - quote form for each product, saved as a *Product* enquiry
7. Site:
   - PRD navigation
   - `/terms` and `/disclaimer`
   - `/about` and `/services` (wording from ASMS)
   - sitemap, robots and canonical tags

**Phase 2: buyer accounts.** Needs a WhatsApp OTP provider (see the open decisions below).
- Phone OTP sign-in from the first Save, completing the pending save afterwards
- Cross-device wishlist, `/saved`, `/account`
- Separate opt-in for WhatsApp messages, data deletion request

**Phase 3: sellers and moderation.** Needs a Google OAuth client for Google sign-in.
- `/sell`, then a 5-step seller wizard with autosave
- Private documents bucket
- Submit → review → changes requested / approved / live
- Live-edit revisions
- Admin submissions queue with checklist, audit log, seller management

**Phase 4: analytics.** The admin overview can start now from the events and enquiries already being recorded; the seller dashboard follows Phase 3.
- Daily metrics rollup
- Seller dashboard (KPIs, per-property stats, 7 / 30 day trends)
- Admin overview and analytics

Iteration 1 and 2 items (compare, saved searches, map search, Tamil) wait for real usage,
as §20 says.

## Open decisions (§20 and setup)

1. Launch inventory: residential, plots, commercial, agricultural?
2. Seller audience: owners only, or brokers and developers too?
3. Buyer contacts shared with sellers: never in the MVP (aggregates only, as the PRD suggests)?
4. WhatsApp OTP provider and approved authentication template. Supabase Auth sends
   phone OTP through Twilio, which supports a WhatsApp channel. Confirm the account and
   per-message cost.
5. Google OAuth client for seller sign-in (Google Cloud console, free).
6. Photo and document limits, and which documents are needed for each property type.
7. Company facts for `/about`, `/services` and `/contact`: phone, email, address, hours.
