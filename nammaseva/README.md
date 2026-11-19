# Namma Seva

Namma Seva is a bilingual local worker directory for Tumakuru. The production setup uses a Vercel-hosted React app and serverless registration endpoint with Supabase for Postgres, authentication, and private photo storage.

## Production setup

The site is not live until you create and configure your own Vercel, Supabase, and Cloudflare Turnstile accounts. Do not send passwords, API keys, or service-role keys in chat or commit them to source control.

### 1. Create Supabase data and policies

1. Create a Supabase project and open **SQL Editor**.
2. Run [`supabase/migrations/20261108000000_production_directory.sql`](./supabase/migrations/20261108000000_production_directory.sql).
3. In **Authentication → Providers**, keep public email sign-ups disabled. Use Supabase Auth only for owner accounts.
4. Create an owner user from **Authentication → Users** and confirm the email.
5. In SQL Editor, replace the example address with the owner's email and run:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where lower(email) = lower('owner@example.com')
   on conflict (user_id) do nothing;
   ```

New worker listings are published immediately after submission. Only users explicitly added to `public.admin_users` can moderate profiles if needed. The public API key cannot change a worker's publication or verification status.

### 2. Configure Cloudflare Turnstile

Create a Turnstile widget for the hostname you will use (the Vercel `*.vercel.app` hostname works before you buy a custom domain). Keep the site key public and the secret key private. Registration checks the token, expected hostname, and action on the server, and the database rate-limits each IP to five submissions per day.

### 3. Deploy to Vercel

Push this project to a Git provider, import it into Vercel, and add these environment variables in **Project Settings → Environment Variables**. Configure the `VITE_*` values for Production and Preview builds; configure the server-only values for the environments where registration should be enabled.

| Variable | Where it is used | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser build | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser build | Supabase publishable/anon key |
| `VITE_TURNSTILE_SITE_KEY` | Browser build | Turnstile site key |
| `SUPABASE_URL` | Vercel Function only | Same Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Function only | Supabase service-role/secret key |
| `TURNSTILE_SECRET_KEY` | Vercel Function only | Turnstile secret key |
| `PUBLIC_SITE_HOSTNAME` | Vercel Function only | Exact deployed hostname, without `https://` |
| `RATE_LIMIT_SECRET` | Vercel Function only | A long random secret used to hash requester IP addresses |

Never add a `VITE_` prefix to a server secret. Vite embeds every `VITE_*` variable into public browser assets. After adding or changing variables, redeploy so the frontend build receives them.

If the worker form says registration protection is not configured, `VITE_TURNSTILE_SITE_KEY` is missing from the production build. Set the Turnstile site key for the Vercel Production environment and redeploy; the form intentionally disables submission rather than accepting an unprotected application.

Vercel uses [`vercel.json`](./vercel.json) to build the React app, route browser paths to the SPA, and set baseline security headers. The `/api/register-worker` function validates submissions, checks Turnstile, rate-limits requests, publishes the worker immediately, and uploads an optional JPEG/PNG/WebP photo (up to 2 MB). The service-role key exists only in this server-side function.

### 4. Profile moderation (optional)

Open `https://YOUR-HOSTNAME/admin` and sign in with the owner Supabase Auth account to moderate a profile if needed. Worker profiles appear in the public directory as soon as their registration is submitted; uploaded photos remain in a private bucket and are shared using short-lived signed URLs. The worker's consent is required before their phone number can appear on a profile.

After a successful submission, the profile is stored in the Supabase `public.workers` table with `status = 'approved'` and appears in public search immediately. An optional photo is saved in the private `worker-photos` Storage bucket. The form shows a success message only after the server confirms the save.

When there are no approved listings, the public directory shows a small set of static demo profiles so the profile flow can be previewed. Each demo is visibly labeled, uses fictional details, has no contact information, and is never represented as a real or verified worker. A Supabase configuration error also shows these demos with the same warning; other request failures remain visible as errors.

### Environment files and local checks

Copy `.env.example` to `.env.local` for local browser configuration, then put real values in the local environment file and never commit it. `npm run dev` starts the Vite development server at `http://localhost:3000`, matching the existing local preview URL. The API endpoint is a Vercel Function, so test worker submissions using a Vercel preview deployment (or `vercel dev`) with the server-only environment variables configured; the Vite server does not provide `/api/register-worker`.

Run the app checks with:

```sh
npm ci
npm test
npm run build
```

## Data access and privacy

- Public visitors can read published workers and approved reviews only.
- Profile status can only be changed by the trusted server or configured administrators.
- Registration never accepts an approval/verification status from the browser.
- The database rate limiter stores a keyed hash of the source IP, not the raw IP.
- Phone numbers are public only when the worker explicitly consents to publish them.
- The directory map loads an OpenStreetMap embed and shows Tumakuru city center only; worker profiles do not collect precise coordinates, so it does not display individual worker locations.
- Use the privacy and terms pages to explain the actual operator, retention period, and contact process before launch. The prototype does not yet include a retention/deletion workflow, worker self-service account, review submission, payments, or booking management.

The old `db.json` file is legacy sample data and is not part of the Vercel/Supabase architecture. Do not copy its development data into production.

### Worker accounts and profile management

Workers create or sign in to an account at `/my-profile` before submitting `/register`. After registration, the profile is public immediately; `/my-profile` lets the owner edit profile details, service areas, photo, and view approved feedback. Deleting the worker profile also deletes its reviews; the Supabase Auth account is signed out but remains available for a later registration.

Before deploying this feature, apply `supabase/migrations/20261119000000_worker_accounts.sql` to the project. In Supabase Authentication, enable the Email provider and allow worker email signups; configure the site's redirect URL for the deployed domain and localhost. If email confirmation is enabled, workers must confirm the signup email before signing in. Existing worker rows created before this change have no account owner and cannot be self-managed; link them to an authenticated user through a trusted admin migration/process before promising existing workers access. Do not disable row-level security.
