/**
 * load_announcements.js
 * ----------------------
 * Pulls recent corporate announcements (board meetings, results dates,
 * other filings) for every tracked stock from NSE, via the nse-bse-api
 * package, and stores them in `corporate_announcements`.
 *
 * NETWORK NOTE: this script makes real HTTP calls to nseindia.com.
 * It must be run from an environment that can reach NSE's servers
 * (your laptop or server) -- it cannot be tested from a sandboxed
 * environment with restricted network access. NSE's site can also
 * be picky about request patterns; if you see repeated failures,
 * check for an nse-bse-api package update first.
 *
 * Usage:
 *   export PGHOST=localhost
 *   export PGPORT=5432
 *   export PGDATABASE=stock_monitor
 *   export PGUSER=dhanshreekhandelwal
 *   export PGPASSWORD=your_actual_password
 *   node load_announcements.js
 */

import { NSE } from "nse-bse-api";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  database: process.env.PGDATABASE || "stock_monitor",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const nse = new NSE("./nse-downloads");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTrackedStocks() {
  const { rows } = await pool.query(
    "SELECT stock_id, ticker FROM stocks WHERE is_tracked = TRUE"
  );
  return rows;
}

async function fetchAnnouncementsForStock(ticker, fromDate, toDate) {
  try {
    const results = await nse.corporate.getAnnouncements({
      symbol: ticker,
      from_date: fromDate,
      to_date: toDate,
    });
    return results || [];
  } catch (err) {
    console.error(`  [ERROR] Failed to fetch announcements for ${ticker}: ${err.message}`);
    return [];
  }
}

async function fetchBoardMeetingsForStock(ticker, fromDate, toDate) {
  try {
    const results = await nse.corporate.getBoardMeetings({
      symbol: ticker,
      from_date: fromDate,
      to_date: toDate,
    });
    return results || [];
  } catch (err) {
    console.error(`  [ERROR] Failed to fetch board meetings for ${ticker}: ${err.message}`);
    return [];
  }
}

/**
 * NSE's announcement/board-meeting response shape isn't fully
 * documented publicly, so this normalizer is defensive: it tries a
 * few likely field name variants rather than assuming one exact
 * shape. If NSE's actual fields differ from what's expected here,
 * this is the function to adjust after inspecting one real response
 * with console.log(JSON.stringify(results[0], null, 2)).
 */
function normalizeAnnouncement(raw, category) {
  const subject = raw.subject || raw.desc || raw.sm_name || raw.attchmntText || "Untitled announcement";
  const dateStr = raw.an_dt || raw.bm_date || raw.date || raw.broadcastdate;
  const attachmentUrl = raw.attchmntFile || raw.attachmentUrl || null;

  if (!dateStr) return null;

  return {
    subject: String(subject).slice(0, 500),
    announcement_date: dateStr,
    category,
    description: raw.attchmntText ? String(raw.attchmntText).slice(0, 2000) : null,
    attachment_url: attachmentUrl,
  };
}

async function upsertAnnouncements(stockId, items) {
  let inserted = 0;
  for (const item of items) {
    if (!item) continue;
    try {
      const result = await pool.query(
        `INSERT INTO corporate_announcements
           (stock_id, announcement_date, category, subject, description, attachment_url, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'NSE')
         ON CONFLICT (stock_id, announcement_date, subject) DO NOTHING
         RETURNING id`,
        [
          stockId,
          item.announcement_date,
          item.category,
          item.subject,
          item.description,
          item.attachment_url,
        ]
      );
      if (result.rows.length > 0) inserted++;
    } catch (err) {
      console.error(`  [ERROR] Insert failed: ${err.message}`);
    }
  }
  return inserted;
}

async function main() {
  if (!process.env.PGPASSWORD) {
    console.error("ERROR: PGPASSWORD environment variable not set.");
    process.exit(1);
  }

  const stocks = await getTrackedStocks();
  console.log(`Loaded ${stocks.length} tracked stocks.`);

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30); // last 30 days + any future scheduled meetings NSE returns

  let totalInserted = 0;

  for (const { stock_id, ticker } of stocks) {
    console.log(`Fetching announcements for ${ticker}...`);

    const announcements = await fetchAnnouncementsForStock(ticker, fromDate, toDate);
    const boardMeetings = await fetchBoardMeetingsForStock(ticker, fromDate, toDate);

    const normalized = [
      ...announcements.map((a) => normalizeAnnouncement(a, "Announcement")),
      ...boardMeetings.map((b) => normalizeAnnouncement(b, "Board Meeting")),
    ].filter(Boolean);

    const n = await upsertAnnouncements(stock_id, normalized);
    totalInserted += n;
    console.log(`  -> ${n} new item(s) saved (${normalized.length} returned)`);

    await sleep(1000); // be polite to NSE's servers
  }

  console.log(`\nDone. ${totalInserted} new announcements inserted across ${stocks.length} stocks.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
