# Supabase setup (admin panel + content)

The website stays static on Hostinger. Supabase holds the content and photos,
and handles staff logins for `/admin`:

```
staff edit in /admin ──► Supabase (database + photos)
                              │ trigger on every change
                              ▼
               GitHub Actions: pull content → build → FTP to Hostinger   (~3 min)
```

Visitors browse static pages: each build copies published content into
`content/content.json` and photos into `public/media/`. The one exception is
the contact form, which adds a row to the `enquiries` table. Visitors can add
an enquiry but never read one; staff answer them on the admin **Enquiries** tab. A twice-weekly
scheduled build keeps the free project from pausing.

## One-time setup

1. **Create a project** at supabase.com (region: *South Asia (Mumbai)*).
   Save the database password somewhere safe.

2. **Create the tables and rules.** *SQL Editor → New query*, paste all of
   [`schema.sql`](schema.sql), **Run**. Safe to run again after updates.
   Then, in a new query, paste and run [`seed-listings.sql`](seed-listings.sql):
   it loads the listings prepared before the database existed (currently
   ASMS-0001, the Aranvoyal plots). It is also safe to run again. Add their
   photos afterwards in `/admin`. To regenerate it from `content/content.json`,
   run `npm run seed:sql`.

3. **Make yourself the first owner** (SQL Editor, with your email):
   ```sql
   insert into public.staff (email, name, role) values ('you@example.com', 'Your name', 'owner');
   ```

4. **Check the sign-up settings.** *Authentication → Sign In / Providers*:
   leave “Allow new users to sign up” **on** (every new seller's first Google
   sign-in creates an account, and the seller portal fails without it), and under
   *Email* keep “Confirm email” **on**. Staff are invited (step 6); the database
   only treats an account as staff when its email is on the Staff list **and**
   confirmed, so a stranger signing up with a staff address gets nothing.

5. **Set where login emails link to.** *Authentication → URL Configuration*:
   - Site URL: `https://asmsrounaqh.com/admin`
   - Redirect URLs: add `https://asmsrounaqh.com/admin` and `http://localhost:5173/admin`

6. **Invite yourself.** *Authentication → Users → Invite user* with the same
   email as step 3. The email links to `/admin`, where you choose a password.
   For other staff: add them on the admin **Staff** tab, then invite them here.

7. **Connect the build.** *Project Settings → API*: copy the **Project URL**
   and the **anon / publishable** key. In GitHub → repo → *Settings → Secrets
   and variables → Actions → **Variables*** add:
   - `SUPABASE_URL` = the Project URL
   - `SUPABASE_ANON_KEY` = the anon/publishable key

   - `WHATSAPP_NUMBER` (optional) = the business WhatsApp number with country
     code, e.g. `919840012345`. Leave it out and the WhatsApp buttons stay hidden.

   These two are public by design (they ship in the admin page); the database
   rules in `schema.sql` are what protect the data. Never use the
   `service_role` key anywhere in this project.

8. **Turn on automatic website updates.** In GitHub → *Settings → Developer
   settings → Fine-grained tokens → Generate*: repository access *Only
   Dentrebair/asms-re*, permission **Contents: Read and write**. Then in the
   Supabase SQL Editor (paste the token here only, never in chat):
   ```sql
   select vault.create_secret('<the token>', 'github_dispatch_token');
   select vault.create_secret('Dentrebair/asms-re', 'github_repo');
   ```
   When the token expires, generate a new one and run
   `select vault.update_secret((select id from vault.secrets where name = 'github_dispatch_token'), '<new token>');`

9. **Optional: email alerts for new enquiries.** Without this step enquiries
   still arrive in the admin panel; this also emails them to you. Create a free
   account at [resend.com](https://resend.com), verify your domain
   (`asmsrounaqh.com`, a few DNS records in Hostinger), and create an API key
   with *Sending access*. Then in the Supabase SQL Editor (never in chat):
   ```sql
   select vault.create_secret('<the Resend API key>', 'resend_api_key');
   select vault.create_secret('sales@asmsrounaqh.com', 'enquiry_notify_to');        -- comma-separate several
   select vault.create_secret('ASMS-ROUNAQH website <website@asmsrounaqh.com>', 'enquiry_notify_from');
   ```
   The "from" address must be on the domain you verified in Resend.

10. **Seller sign-in with Google (the seller portal at `/seller`).** Until this is
    done the portal's "Continue with Google" button shows "provider is not enabled".
    In your own Google account at [console.cloud.google.com](https://console.cloud.google.com):
    1. Create a project (e.g. "ASMS-ROUNAQH website").
    2. *APIs & Services → OAuth consent screen*: User type **External**, app name
       `ASMS-ROUNAQH`, support email `reach@asmsrounaqh.com`, authorised domain
       `asmsrounaqh.com`. Add the scopes `email`, `profile` and `openid` only.
    3. *Credentials → Create credentials → OAuth client ID*, type **Web application**.
       Authorised JavaScript origins: `https://asmsrounaqh.com`. Authorised redirect
       URI: the callback URL Supabase shows under *Authentication → Sign In /
       Providers → Google* (it looks like `https://<project>.supabase.co/auth/v1/callback`).
    4. Copy the Client ID and Client secret straight into that Supabase Google
       provider form and enable it. Don't send the secret to anyone.
    5. Back on the consent screen, **Publish app** so any Google user can sign in.
    6. In Supabase, *Authentication → URL Configuration*: add
       `https://asmsrounaqh.com/seller` under *Redirect URLs*, so Google can send
       sellers back to the portal. Leave the Site URL as `/admin` (step 5): staff
       invite emails use it.

    `schema.sql` already creates everything else the portal needs: seller profiles,
    the review functions, the audit log and the private `seller-docs` storage bucket.

## Notes

- **Roles:** *editors* manage properties and products; *owners* can also manage staff.
  There must always be at least one owner.
- **Drafts:** unpublished items are visible only in `/admin`. The 12 typical product
  lines are pre-loaded as drafts — add photos, check specs, then publish.
- **Login emails** use Supabase's built-in mailer, which is rate-limited. That's fine
  for a few staff invites; for more, set up custom SMTP (e.g. your Hostinger mailbox)
  under *Authentication → Emails*.
- **Enquiries:** property enquiries, site visit requests (a request, never a
  booking), product quotes and general questions. Limited to 3 an hour from
  one phone number and 30 every 10 minutes in total. Staff move each through
  New, Visit requested, Contacted, Qualified, Negotiation and a closed state,
  assign it, set a follow-up date and keep private notes; every change is
  logged with who made it. Enquiries for sold or paused properties are refused.
- **Measurement:** property page views (after 3 seconds), WhatsApp button
  clicks and shares are stored in `events` with a random browser code, never
  a name or phone. Repeats from one browser within 10 minutes and staff
  browsing are ignored. Seller and admin dashboards will read these.
- **Seller portal:** anyone can sign in at `/seller` with Google, say who they are
  (owner, broker or agent, developer or builder, other) and list a property. A
  seller can only write the listing's own fields, and only while it is a draft or
  sent back for changes; the reference, web address, stage and "featured" are set
  by the database. Sending it for review, the review decisions (start, request
  changes, reject, approve) and changes to live listings all go through database
  functions, and every step is recorded in `audit_log`. Ownership documents go to
  the private `seller-docs` bucket: only the seller and staff can open them, through
  links that expire after 10 minutes. Seller photos go to `media/sellers/<their id>/`.
  Drafts, autosaves and review steps never start a website rebuild; going live does.
  Staff can suspend a seller from the *Sellers* tab, which stops new listings and changes.
- **Testing the rules locally:** `npm run test:db` applies `schema.sql` to a throwaway
  Postgres and checks every permission (needs Postgres installed).

## Local development against Supabase

Create `.env.local` (git-ignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`npm run dev` → `http://localhost:5173/admin`. `npm run content:pull` refreshes
`content/content.json` from Supabase (don't commit that change — the committed
file is sample data used when Supabase isn't configured).
