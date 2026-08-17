# Finance Tracker

A mobile-first expense tracker that writes straight into your existing Google Sheet. Add an expense with amount + category on your phone, see a monthly breakdown, and every entry lands in the current month's tab in the Sheet — no separate database.

## How it works

- **Storage**: the Google Sheet itself is the only data store. Each new expense is appended as a row in the sheet tab matching the current month (e.g. `Aug'26`).
- **Monthly tabs**: you keep managing these manually — duplicate the `Template` tab and rename it to `Mon'YY` (e.g. `Sep'26`) near the end of each month, same as you do today. The app looks up the tab whose name matches the current month; if it doesn't exist yet, adding an expense will fail with a clear error telling you to create it.
- **Auth**: none — the app is open to anyone with the URL. Fine for a personal link only you know, but be aware it's not access-controlled.
- **Table layout assumption**: the app writes/reads columns `D:G` as `Date | Category | Amount | Remarks` on whichever tab matches the month name — it finds the last row of that block automatically, so it doesn't matter which row your header is on. If your table actually starts in a different column, change `TABLE_COLUMNS` in `src/lib/config.ts`.

## One-time setup

### 1. Create a Google Cloud service account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. Enable the **Google Sheets API** for that project.
3. Go to **IAM & Admin → Service Accounts → Create Service Account**. Any name is fine.
4. Open the new service account → **Keys** → **Add Key** → **Create new key** → JSON. This downloads a JSON file — keep it private.
5. From that JSON file you need two values: `client_email` and `private_key`.

### 2. Share the Sheet with the service account

Open your expenses sheet, click **Share**, and add the service account's `client_email` as an **Editor**.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

- `GOOGLE_SHEET_ID` — your sheet's ID, from its URL: `/spreadsheets/d/<THIS PART>/edit`.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` from the JSON key.
- `GOOGLE_PRIVATE_KEY` — the `private_key` from the JSON key, quoted, with `\n` kept as literal `\n` (not real newlines).

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and try adding an expense to the current month's tab.

## Deploying to Vercel

1. Push this repo to GitHub (or import directly from your local folder with the Vercel CLI).
2. In the Vercel dashboard, import the project.
3. Add the same environment variables from `.env.local` under **Settings → Environment Variables**.
4. Deploy. Vercel will give you a URL — add it to your phone's home screen (Share → Add to Home Screen on iOS, or the browser menu on Android) for an app-like experience.

## Project structure

- `src/app/page.tsx` — Add Expense screen (root route).
- `src/app/overview/page.tsx` — Monthly overview (total, by-category breakdown, recent entries).
- `src/app/budget/page.tsx` — Income/budget editor for the current month's Income & Spending Breakdown block.
- `src/app/api/expenses/route.ts` — Reads/writes expenses via the Sheets API.
- `src/app/api/budget/route.ts` — Reads/writes the budget block via the Sheets API.
- `src/lib/sheets.ts` — Google Sheets client: tab resolution, expenses, budget.
- `src/lib/categories.ts` — Fixed category list and colors (matches the Sheet's dropdown).
- `src/lib/config.ts` — Sheet layout assumptions (column range, accumulate-in-place rules).
- `src/components/` — Shared UI: bottom nav, category picker, theme toggle, toast notifications, confirm dialog.

## Notable behavior

- **Accumulate-in-place**: some category + remarks combos (configured in `src/lib/config.ts`, e.g. Transport + "Public Transport") merge into one existing row per month instead of appending a new row each time, by extending that cell's own formula (`=9.48+5.08+...`) rather than overwriting it with a computed number.
- **Budget block**: `src/app/budget` only ever writes the sheet's actual input cells (income, savings %, category costs) — every derived figure (income after CPF, totals, percentages, remaining) is left to the sheet's own formulas.
- **Light/dark mode**: toggled via the sun/moon button in the header, persisted to `localStorage`, defaulting to system preference on first visit.
