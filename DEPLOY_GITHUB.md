# Deploying GlassHouse with GitHub (no terminal, no Mac install)

You commit code to GitHub; GitHub's servers deploy the backend; Vercel deploys
the frontend. You can do every step in a web browser.

Order matters: **nothing costs money until Step 7.** You'll have a working app
in *simulated* mode before you ever add a paid API key.

---

## Step 1 — Create the Supabase project (browser)

1. Go to https://database.new and create a project. Pick a region near you and
   set a strong database password — **save that password**, you'll need it in Step 4.
2. When it finishes, open **Project Settings → General** and copy the
   **Reference ID** (looks like `abcdwxyz1234`). Save it.
3. **Project Settings → API**: copy the **Project URL** and the **anon public**
   key. Save both (the frontend uses them).

## Step 2 — Get a Supabase access token (browser)

1. Go to https://supabase.com/dashboard/account/tokens
2. Generate a new token, name it `github-actions`. Copy it — you only see it once.

## Step 3 — Put the code on GitHub (browser)

1. Create a new repository at https://github.com/new (private is fine).
2. Upload the project files. Easiest in-browser way: on the repo page click
   **Add file → Upload files**, drag in the `supabase/` folder and the
   `.github/` folder (and your frontend later). Commit to `main`.
   - Your repo should contain at least:
     ```
     .github/workflows/deploy-backend.yml
     supabase/config.toml
     supabase/migrations/0001_init.sql
     supabase/migrations/0002_auth_bootstrap.sql
     supabase/migrations/0003_messaging.sql
     supabase/functions/...
     ```

## Step 4 — Add deploy secrets to GitHub (browser)

In your repo: **Settings → Secrets and variables → Actions → New repository secret.**
Add three:

| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | the token from Step 2 |
| `SUPABASE_PROJECT_REF` | the Reference ID from Step 1 |
| `SUPABASE_DB_PASSWORD` | the database password from Step 1 |

## Step 5 — Run the deploy

The workflow runs automatically on push. To trigger it now:
**Actions tab → "Deploy backend" → Run workflow.**

Watch it go green. This pushes your three migrations and deploys all four Edge
Functions to Supabase. If a step fails, click it to read the log — and paste me
the error.

> At this point the backend is LIVE but in **simulated mode**: the prospects
> function returns mock homeowners and messages "send" without a real provider.
> That's intentional — you can test the whole flow free.

## Step 6 — Deploy the frontend on Vercel (browser)

1. Go to https://vercel.com and sign in **with GitHub**.
2. **Add New → Project →** import your repo.
3. Framework preset: **Vite**. (If the React app is in a subfolder, set the
   Root Directory to that folder.)
4. **Environment Variables** — add:
   ```
   VITE_SUPABASE_URL        = your Project URL (Step 1)
   VITE_SUPABASE_ANON_KEY   = your anon public key (Step 1)
   VITE_GOOGLE_MAPS_KEY     = (add in Step 7; leave blank for now)
   ```
5. Deploy. You get a live URL like `your-app.vercel.app`. Sign up, log in, and
   you should see the board — running on the real database, still simulated for
   data/messaging.

## Step 7 — Go live, one provider at a time (now it costs)

Each is added in the **Supabase dashboard → Project Settings → Edge Functions →
Secrets** (or **Edge Functions → Manage secrets**). No code change, no redeploy
needed for secrets.

- **Google Maps** (map shows real streets): create a restricted key (see
  `SETUP.md`), add `VITE_GOOGLE_MAPS_KEY` in Vercel, redeploy frontend.
- **Property data** (real homeowners): set `PROPERTY_API_KEY` + `PROPERTY_API_URL`,
  then uncomment the real call in `supabase/functions/prospects/index.ts` and
  push (GitHub redeploys it).
- **SMS** (real texting): set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_FROM_NUMBER`, `SMS_INBOUND_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Then in
  the Twilio console point your number's inbound webhook at
  `https://<ref>.supabase.co/functions/v1/sms-inbound`.
- **Email**: set `RESEND_API_KEY` and `EMAIL_FROM`.

## After this

Any change you make: edit a file on GitHub (web editor is fine) → commit to
`main` → the workflow redeploys the backend and Vercel redeploys the frontend.
That's your whole release process, all in the browser.

---

### Before real SMS — non-negotiable
- Complete **A2P 10DLC** brand + campaign registration in Twilio (takes days).
- Get **TCPA legal review** of how you collect consent. The code enforces
  opt-out, but consent to contact is a legal question. I'm not a lawyer.

### If something breaks
Copy the failing step's log (Actions tab for backend, Vercel's build log for
frontend) and bring it here with the exact error text.
