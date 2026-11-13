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

3. **Make yourself the first owner** (SQL Editor, with your email):
   ```sql
   insert into public.staff (email, name, role) values ('you@example.com', 'Your name', 'owner');
   ```

4. **Lock down sign-ups.** *Authentication → Sign In / Providers*: turn **off**
   “Allow new users to sign up”. Staff are invited instead (step 6).

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

## Notes

- **Roles:** *editors* manage properties and products; *owners* can also manage staff.
  There must always be at least one owner.
- **Drafts:** unpublished items are visible only in `/admin`. The 12 typical product
  lines are pre-loaded as drafts — add photos, check specs, then publish.
- **Login emails** use Supabase's built-in mailer, which is rate-limited. That's fine
  for a few staff invites; for more, set up custom SMTP (e.g. your Hostinger mailbox)
  under *Authentication → Emails*.
- **Enquiries:** limited to 3 an hour from one phone number and 30 every
  10 minutes in total, to stop floods of spam. Staff can mark each one New,
  Contacted or Closed, keep private notes, and delete it. Enquiries never
  trigger a website rebuild.
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
