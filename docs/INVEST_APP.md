# Fudge Invest: internal investment manager

`apps/invest` tracks **Webfudge's own money**: stocks, ETFs, mutual funds and SIPs. For each holding it shows what we put in, what it's worth now, and how it has done (absolute, %, XIRR).

**It belongs to the Internal deployment only** (`master` → `api.webfudge.in`). It is not part of the SaaS:

- Every `/api/invest/*` route answers **404** when `PLATFORM_MODE=saas`.
- The frontend refuses to render when built with `NEXT_PUBLIC_PLATFORM_MODE=saas`.
- No SaaS Vercel project should ever be created for `apps/invest`. When `master` is merged into `saas`, the code travels along, but it stays dark. The three new tables are created empty and are never reachable.

## Screens

| Route | What it shows |
|---|---|
| `/` Portfolio | Current value, invested, unrealised P&L, XIRR, today's change, allocation by type, net invested over time, top holdings, recent transactions, upcoming SIP instalments |
| `/holdings` | Open holdings by type (units, avg cost, price, invested, value, P&L, today, XIRR) with totals, plus closed positions with realised P&L |
| `/holdings/:id` | Stock or fund detail: price/NAV history (1M–5Y or since first buy) against our average cost, with a dot for each purchase; every transaction with "now vs then" |
| `/transactions` | All buys, sells, SIP instalments and dividends. Filter, search, edit, delete, CSV export |
| `/sips` | SIP plans with instalments, invested, value, gain, next due date and missed instalments. **Record due instalments** fills past instalments in at each date's published NAV |

## How the numbers work

- **Cost basis is FIFO**, the same way Indian capital gains are computed. Buy cost = amount + charges. Sell proceeds = amount − charges.
- **Invested** is the cost of the units still held. **Realised P&L** comes from sells. **Dividends** are tracked separately. **Total returns** = unrealised + realised + dividends.
- **XIRR** uses every cash flow (buys and SIPs out; sells and dividends in), with today's value as the final inflow. It shows "—" for spans shorter than 7 days, where annualising would be meaningless.
- A holding with no price yet is **valued at cost** and flagged, so totals aren't distorted.
- The maths lives in `apps/invest/lib/portfolio.mjs` and `lib/sip.mjs`. Unit tests (including the reference XIRR value from Excel's documentation) run with `npm test --workspace=@webfudge/invest`.

## Backend (additive only)

There are three new collection types, all with new tables. No existing schema was changed.

| Content type | Table | Holds |
|---|---|---|
| `api::invest-instrument.invest-instrument` | `invest_instruments` | Stock/ETF/fund/other: symbol + exchange, AMFI scheme code, ISIN, last price, previous close, price time, source and last error |
| `api::invest-transaction.invest-transaction` | `invest_transactions` | `buy` / `sell` / `sip` / `dividend`: date, units, price, amount, charges, account, folio, optional link to a SIP |
| `api::invest-sip.invest-sip` | `invest_sips` | Amount, frequency (monthly/quarterly/weekly), SIP day, start/end, status, folio |

All rows carry `organization` (the active org from `X-Organization-Id`) and `createdByUser`. Numbers are `float` because Strapi's `decimal` maps to `decimal(10,2)`, which would round mutual-fund units and NAVs to 2 places.

**Endpoints:** CRUD on `/api/invest/instruments|transactions|sips`, plus:

| Endpoint | Purpose |
|---|---|
| `GET /api/invest/access` | Whether the signed-in user may open the app (used by the frontend gate) |
| `POST /api/invest/prices/refresh` `{ force? }` | Re-prices the org's instruments. Skips prices fetched less than `INVEST_PRICE_TTL_MINUTES` ago (default 10) unless `force` |
| `GET /api/invest/lookup?kind=stock\|mutual_fund&q=` | Symbol/scheme search used when adding an instrument |
| `GET /api/invest/instruments/:id/history?from=YYYY-MM-DD` | Daily price/NAV history for charts (cached in memory for 1 h) |
| `POST /api/invest/sips/:id/sync` | Creates missing instalments of an active SIP at each due date's NAV (next published NAV within 10 days). Units are rounded to 3 decimals for funds and to whole shares for stocks |

`/api/invest` is excluded from the Redis GET cache (live prices; financial data stays out of Redis).

### Access control

The access check is done in the API (`apps/backend/src/utils/invest/access.js`), not just in the UI:

1. The route is never available on the SaaS (404).
2. The user must be signed in, with an active organization.
3. `INVEST_ORG_IDS` (comma-separated org ids), if set, limits which organization may use it. **Set this to Webfudge's org id in production.**
4. `INVEST_ALLOWED_EMAILS` (comma-separated), if set, is the exact list of people allowed. If unset, only organization **Admins** are allowed.

### API environment variables (Railway, Internal API service)

| Variable | Default | Notes |
|---|---|---|
| `INVEST_ORG_IDS` | unset (any org) | Recommended: Webfudge's org id |
| `INVEST_ALLOWED_EMAILS` | unset (org admins only) | e.g. founders + finance |
| `INVEST_STOCK_PROVIDER` | `yahoo` | `yahoo`, `upstox` or `none` (manual prices) |
| `INVEST_PRICE_TTL_MINUTES` | `10` | How long a fetched price counts as fresh |
| `UPSTOX_ACCESS_TOKEN` | unset | Only if `INVEST_STOCK_PROVIDER=upstox`. Never commit it |

### Frontend (Vercel, Internal team only)

Create a new Vercel project for `apps/invest` on the **Internal** team, using the same settings as PM/CRM: root directory `apps/invest`, branch `master`, domain `invest.webfudge.in`. The API already accepts `*.webfudge.in` origins, and `invest.webfudge.in` is listed explicitly.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.webfudge.in` |
| `NEXT_PUBLIC_INVEST_APP_URL` | `https://invest.webfudge.in` |

Local dev: `npm run dev:invest` (port 3008) against a local backend. Copy `apps/invest/.env.example` to `.env.local`.

## Market data: research and recommendation (November 2026)

### Mutual funds: free and official

| Source | Cost | Auth | Notes |
|---|---|---|---|
| **AMFI `NAVAll.txt`** (amfiindia.com) | Free | None | Official daily NAV for every scheme, in one ~2 MB semicolon-delimited file. Latest NAV only, no history. Published in the evening after market close |
| **mfapi.in** | Free | None | Community JSON API over AMFI data: per-scheme latest NAV, full history, date-range filter and scheme search. No SLA |

**Used:** mfapi.in first (it gives history, search and the previous NAV for day change), falling back to AMFI `NAVAll.txt` when mfapi is down. NAVs are end-of-day by nature, so "live" for a fund means today's or yesterday's NAV.

### Stocks (NSE/BSE)

| Option | Cost | Daily login? | Rate limits / terms | Holdings import |
|---|---|---|---|---|
| **Zerodha Kite Connect** | **₹500/month** per app for the Connect plan, which includes live WebSocket data and historical candles. The free "Personal" plan has **no market data** | Yes. The access token expires daily and needs an interactive login (OAuth + TOTP) | About 10 req/s on quotes; built for Zerodha account holders | Yes, `/portfolio/holdings` (on the free Personal plan too) |
| **Upstox API** | **Free** trading and data APIs for Upstox account holders | The standard token expires daily (about 3:30 AM IST). A long-lived **read-only Analytics token** (about 1 year) covers market and historical data without daily login | Per-account rate limits; some older quote endpoints are deprecated | Yes |
| **Angel One SmartAPI** | Free with an Angel One account | Yes. Session via client code + PIN + TOTP; tokens need regenerating | Forum-reported limits of about 1–10 req/s per endpoint; few published official numbers | Yes |
| **DhanHQ** | Trading API free; **Data API ₹499 + GST/month** (the free-with-trades offer ended) | Long-lived token (no daily login) | 5 WebSocket connections, separate quote limits | Yes |
| **ICICI Breeze** | Free with an ICICI Direct account | Yes. The session token expires daily | 100 calls/min, 5,000/day. Orders need a registered static IP | Yes |
| **Yahoo Finance** public endpoints | Free, no key | No | **Unofficial and undocumented**, no SLA, delayed. Yahoo's terms restrict use to personal/non-commercial purposes | No |
| NSE website JSON | Free | No | Blocks automated clients; scraping is against NSE's terms. **Not used** | No |

### Recommendation

1. **Now (built):** funds via **mfapi.in → AMFI** (free, official data); stocks via **Yahoo Finance delayed quotes**, refreshed on demand. That's enough for a company portfolio that's checked a few times a day. Every source sits behind one provider interface (`apps/backend/src/utils/invest/prices.js`), and any instrument can fall back to a manual price.
2. **Next (when we want an official, reliable stock feed):** **Upstox with the read-only Analytics token**. It's free, needs no daily login and is officially supported, so it's the best fit for a server that refreshes prices unattended. An adapter is already in `providers/upstox.js` (it needs an ISIN on each stock). To switch, set `INVEST_STOCK_PROVIDER=upstox` and `UPSTOX_ACCESS_TOKEN` on the API service. It hasn't been exercised against the live API yet, so verify it with a real token first.
3. **If Webfudge's demat is with Zerodha** and we want automatic holdings import, the free Kite Connect Personal plan can read holdings, but not prices. That needs a daily login, so it suits a manual "Import from Zerodha" button rather than background sync.
4. Kite Connect (₹500/mo) or the Dhan Data API (₹499/mo) only make sense if we need tick-level live data. A treasury tracker doesn't.

Connecting any broker account, or entering API keys or tokens, is a decision for the account owner. Keys go only into Railway variables, never into the repo.

### Known limits

- Yahoo symbols: NSE uses the ticker (`INFY`). BSE also uses the ticker (`RELIANCE` on BSE), not the numeric scrip code.
- Corporate actions (splits, bonuses) aren't automatic. Record a bonus as a buy at ₹0, and a split as a sell of the old units plus a buy of the new ones at the same total cost.
- Holdings import from brokers or CAS statements isn't built yet; transactions are entered by hand or via SIP auto-record.
