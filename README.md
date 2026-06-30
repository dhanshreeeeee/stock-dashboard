# Stock dashboard

A two-part app: a Fastify backend (reads from `stock_monitor` Postgres)
and a React/Vite frontend (overview table + per-stock detail pages).

## Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (don't commit this anywhere):

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=stock_monitor
PGUSER=your_db_user
PGPASSWORD=your_db_password
PORT=4001
```

Run it:

```bash
npm run dev
```

Should print `Server listening at http://0.0.0.0:4001`.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. The Vite dev server proxies any
`/api/*` request to the backend on port 4001 (see `vite.config.js`) --
no extra config needed for local development.

## What's included

- **Overview page** (`/`) -- every tracked stock, sortable by cap rank,
  % change, or RVOL. Filter checkboxes let you combine your own
  conditions (price up, volume above both averages, minimum RVOL) --
  there's no single combined "score," by design: each condition is
  visible and you choose how to combine them.
- **Stock detail page** (`/stock/TICKER`) -- price/volume chart, the
  same metrics as the overview row plus price-vs-20d-average, company
  profile (CEO, promoter holding, etc. -- populates once you fill in
  `company_profile` and `news_items`), and a news feed.

## Known gaps / next steps

- `company_profile` and `news_items` tables are empty right now -- the
  detail page will just hide those sections until you populate them
  (via a future scraper/news-API script, or manual entry).
- The breakout flag here is recomputed live from `daily_history` so it
  works outside market hours; once `live_ticks` has same-day data
  flowing in from `live_ticker.py`, we can swap this to use the more
  current `breakout_candidates` view from schema/003 instead.
- No auth on the backend -- fine for personal/local use behind your
  Windows Server's reverse proxy, but don't expose port 4001 directly
  to the public internet without adding at least a shared-secret check.

## Deploying alongside your other VTL systems

Same pattern as OMS/VWORKECO: run the backend with PM2
(`pm2 start src/server.js --name stock-dashboard-api`), build the
frontend (`npm run build` inside `frontend/`) and serve the resulting
`frontend/dist/` folder as static files through your existing Nginx/
reverse-proxy config under a new subdomain.
