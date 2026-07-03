# BTC Profit Calculator

A simple web app for calculating BTC trading profit with text commands, running free 24/7 on Vercel. Requires a free account (username + password) — all data is synced to your account via Supabase.

## Commands

```
/cal <buy_price> <sell_price> <amount_usd>   — quick profit calc, shown in History
/profit <entry> <sell> <money>               — records profit into Total Profit
/goal <price>                                — draws a take-profit target line on the chart
/cleargoal                                   — removes the target line
/entry <price>                               — draws an entry price line on the chart
/clearentry                                  — removes the entry line
```

Example: `/cal 59500 63500 151`

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

You'll need a Supabase project configured (see below) for the app to work — accounts are required, there is no guest/local-only mode.

## Supabase setup (required)

This app uses Supabase for authentication and storing all your data (profit ledger, goal/entry price marks, command history).

1. Create a free project at [supabase.com](https://supabase.com) → **Settings → API**, grab the `Project URL` and `anon public key`.
2. In **SQL Editor**, run the migration in `supabase/migration.sql` (or ask the app's maintainer for the schema — it creates `profiles`, `profit_entries`, `user_price_marks`, and `command_history`, all scoped to `auth.uid()` via row-level security).
3. **Authentication → Providers → Email**: turn OFF "Confirm email". Accounts here use a synthetic internal email (`username@mail.btc-profit-calculator-tau.vercel.app`) that can't receive a real confirmation message, so sign-up would otherwise never produce a working session.
4. Create `.env.local` (gitignored) from `.env.local.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx
   ```
5. On Vercel: **Settings → Environment Variables**, add the same two variables → redeploy.

> Note: the login screen only ever asks for a "username", never an email — under the hood it signs up/in with Supabase Auth using a derived `username@mail.btc-profit-calculator-tau.vercel.app` address. Real per-user data isolation is enforced by Postgres row-level security (`auth.uid() = user_id`), not just client-side filtering.

## Google sign-in setup (optional)

The login screen has a "Continue with Google" button. It's wired up in the code, but Google is not a default-on Supabase provider — you need to create your own OAuth credentials:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (type: Web application).
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (find the exact URL in Supabase Dashboard → Authentication → Providers → Google, it's shown there once you open the panel).
2. Copy the generated **Client ID** and **Client Secret**.
3. In Supabase Dashboard → **Authentication → Providers → Google**: enable it, paste the Client ID/Secret, save.
4. In Supabase Dashboard → **Authentication → URL Configuration**: add your app's URL (both `http://localhost:3000` for local dev and your production Vercel URL) to **Redirect URLs**.

Until this is configured, clicking "Continue with Google" will land on a Supabase error page instead of Google's consent screen — the username/password flow above works independently and doesn't require this.

## Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Vercel auto-detects Next.js, no extra config needed.
4. Add the two Supabase environment variables (see above).
5. Click **Deploy**.

## Notes

- Live BTC price comes from a Binance WebSocket, auto-reconnects on drop; the browser tab title also shows the live price.
- All personal data (profit ledger, goal/entry lines, command history) is stored in Supabase, scoped per account — nothing is kept in `localStorage` anymore.
