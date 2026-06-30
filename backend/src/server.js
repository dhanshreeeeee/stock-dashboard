import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });

/**
 * GET /api/stocks
 * Overview list: every tracked stock with its latest price, the prior
 * day's close/volume, % change, position vs 20d/50d average volume,
 * and the breakout flag. Price/volume prefer LIVE data from
 * live_ticks when a tick has landed in the last 5 minutes (i.e.
 * live_ticker.py is actively running); otherwise this falls back to
 * yesterday's close from daily_history, so the dashboard still works
 * correctly outside market hours or when the live ticker isn't running.
 */
fastify.get("/api/stocks", async (request, reply) => {
  const { cap_tier } = request.query;

  const params = [];
  let whereClause = "WHERE s.is_tracked = TRUE";
  if (cap_tier) {
    params.push(cap_tier);
    whereClause += ` AND s.cap_tier = $${params.length}`;
  }

  const { rows } = await pool.query(
    `
    WITH ranked AS (
      SELECT
        stock_id, trade_date, close_price, volume,
        avg_volume_20d, avg_volume_50d,
        LAG(close_price) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_close,
        LAG(volume) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_volume,
        ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY trade_date DESC) AS rn
      FROM daily_history
    ),
    latest_daily AS (
      SELECT * FROM ranked WHERE rn = 1
    ),
    latest_live AS (
      SELECT DISTINCT ON (stock_id)
        stock_id, ltp, cumulative_volume, tick_time
      FROM live_ticks
      WHERE tick_time > now() - interval '5 minutes'
      ORDER BY stock_id, tick_time DESC
    )
    SELECT
      s.stock_id, s.ticker, s.company_name, s.cap_tier, s.cap_rank, s.market_cap_cr,
      d.trade_date, d.prev_close, d.avg_volume_20d, d.avg_volume_50d,
      COALESCE(ll.ltp, d.close_price) AS close_price,
      COALESCE(ll.cumulative_volume, d.volume) AS volume,
      d.prev_volume,
      (ll.tick_time IS NOT NULL) AS is_live,
      ROUND(((COALESCE(ll.ltp, d.close_price) - d.prev_close) / d.prev_close * 100)::numeric, 2) AS pct_change,
      ROUND((COALESCE(ll.cumulative_volume, d.volume)::numeric / NULLIF(d.avg_volume_20d, 0)), 2) AS rvol_20d,
      ROUND((COALESCE(ll.cumulative_volume, d.volume)::numeric / NULLIF(d.avg_volume_50d, 0)), 2) AS rvol_50d,
      (
        COALESCE(ll.ltp, d.close_price) > d.prev_close
        AND COALESCE(ll.cumulative_volume, d.volume) > d.prev_volume
        AND COALESCE(ll.cumulative_volume, d.volume) > d.avg_volume_20d
        AND COALESCE(ll.cumulative_volume, d.volume) > d.avg_volume_50d
      ) AS breakout
    FROM stocks s
    JOIN latest_daily d ON d.stock_id = s.stock_id
    LEFT JOIN latest_live ll ON ll.stock_id = s.stock_id
    ${whereClause}
    ORDER BY s.cap_tier, s.cap_rank
    `,
    params
  );

  reply.send(rows);
});

/**
 * GET /api/stocks/:ticker
 * Full detail for one stock: profile info, full daily_history (for
 * charting), and the same breakout/RVOL metrics as the overview list.
 */
fastify.get("/api/stocks/:ticker", async (request, reply) => {
  const { ticker } = request.params;

  const stockResult = await pool.query(
    `SELECT s.*, cp.ceo_name, cp.md_name, cp.chairman_name, cp.founded_year,
            cp.headquarters, cp.business_summary, cp.promoter_holding_pct,
            cp.promoter_pledge_pct
     FROM stocks s
     LEFT JOIN company_profile cp ON cp.stock_id = s.stock_id
     WHERE s.ticker = $1`,
    [ticker.toUpperCase()]
  );

  if (stockResult.rows.length === 0) {
    return reply.code(404).send({ error: "Stock not found" });
  }
  const stock = stockResult.rows[0];

  const historyResult = await pool.query(
    `SELECT trade_date, open_price, high_price, low_price, close_price,
            volume, avg_volume_20d, avg_volume_50d
     FROM daily_history
     WHERE stock_id = $1
     ORDER BY trade_date ASC`,
    [stock.stock_id]
  );

  const metricsResult = await pool.query(
    `WITH price_avgs AS (
       SELECT
         stock_id, trade_date, close_price, volume, avg_volume_20d, avg_volume_50d,
         AVG(close_price) OVER (
           PARTITION BY stock_id ORDER BY trade_date
           ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
         ) AS price_avg_20d,
         LAG(close_price) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_close,
         LAG(volume) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_volume,
         ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY trade_date DESC) AS rn
       FROM daily_history
       WHERE stock_id = $1
     ),
     live AS (
       SELECT ltp, cumulative_volume, tick_time
       FROM live_ticks
       WHERE stock_id = $1 AND tick_time > now() - interval '5 minutes'
       ORDER BY tick_time DESC
       LIMIT 1
     )
     SELECT
       COALESCE(live.ltp, pa.close_price) AS close_price,
       pa.prev_close,
       COALESCE(live.cumulative_volume, pa.volume) AS volume,
       pa.prev_volume, pa.avg_volume_20d, pa.avg_volume_50d,
       (live.tick_time IS NOT NULL) AS is_live,
       ROUND(((COALESCE(live.ltp, pa.close_price) - pa.prev_close) / pa.prev_close * 100)::numeric, 2) AS pct_change,
       ROUND(((COALESCE(live.ltp, pa.close_price) - pa.price_avg_20d) / pa.price_avg_20d * 100)::numeric, 2) AS price_vs_20d_pct,
       ROUND((COALESCE(live.cumulative_volume, pa.volume)::numeric / NULLIF(pa.avg_volume_20d, 0)), 2) AS rvol_20d,
       ROUND((COALESCE(live.cumulative_volume, pa.volume)::numeric / NULLIF(pa.avg_volume_50d, 0)), 2) AS rvol_50d,
       (COALESCE(live.ltp, pa.close_price) > pa.prev_close
        AND COALESCE(live.cumulative_volume, pa.volume) > pa.prev_volume
        AND COALESCE(live.cumulative_volume, pa.volume) > pa.avg_volume_20d
        AND COALESCE(live.cumulative_volume, pa.volume) > pa.avg_volume_50d) AS breakout
     FROM price_avgs pa
     LEFT JOIN live ON true
     WHERE pa.rn = 1`,
    [stock.stock_id]
  );

  reply.send({
    ...stock,
    metrics: metricsResult.rows[0] || null,
    history: historyResult.rows,
  });
});

/**
 * GET /api/stocks/:ticker/news
 * Recent news items for a stock, most recent first.
 */
fastify.get("/api/stocks/:ticker/news", async (request, reply) => {
  const { ticker } = request.params;
  const limit = parseInt(request.query.limit || "20", 10);

  const { rows } = await pool.query(
    `SELECT n.headline, n.source_name, n.source_url, n.published_at,
            n.summary, n.sentiment
     FROM news_items n
     JOIN stocks s ON s.stock_id = n.stock_id
     WHERE s.ticker = $1
     ORDER BY n.published_at DESC
     LIMIT $2`,
    [ticker.toUpperCase(), limit]
  );

  reply.send(rows);
});

/**
 * GET /api/sectors
 * Aggregate stats per sector: stock count, average % change, how many
 * up vs down today, average RVOL, and how many are currently breaking
 * out. This is the "what's the sector doing as a whole" view.
 */
fastify.get("/api/sectors", async (request, reply) => {
  const { rows } = await pool.query(`
    WITH ranked AS (
      SELECT
        stock_id, trade_date, close_price, volume, avg_volume_20d, avg_volume_50d,
        LAG(close_price) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_close,
        LAG(volume) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_volume,
        ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY trade_date DESC) AS rn
      FROM daily_history
    ),
    latest AS (
      SELECT * FROM ranked WHERE rn = 1
    ),
    per_stock AS (
      SELECT
        s.sector,
        s.stock_id,
        ROUND(((l.close_price - l.prev_close) / l.prev_close * 100)::numeric, 2) AS pct_change,
        ROUND((l.volume::numeric / NULLIF(l.avg_volume_20d, 0)), 2) AS rvol_20d,
        (
          l.close_price > l.prev_close
          AND l.volume > l.prev_volume
          AND l.volume > l.avg_volume_20d
          AND l.volume > l.avg_volume_50d
        ) AS breakout
      FROM stocks s
      JOIN latest l ON l.stock_id = s.stock_id
      WHERE s.is_tracked = TRUE AND s.sector IS NOT NULL
    )
    SELECT
      sector,
      COUNT(*) AS stock_count,
      ROUND(AVG(pct_change)::numeric, 2) AS avg_pct_change,
      COUNT(*) FILTER (WHERE pct_change > 0) AS up_count,
      COUNT(*) FILTER (WHERE pct_change < 0) AS down_count,
      ROUND(AVG(rvol_20d)::numeric, 2) AS avg_rvol_20d,
      COUNT(*) FILTER (WHERE breakout) AS breakout_count
    FROM per_stock
    GROUP BY sector
    ORDER BY avg_pct_change DESC
  `);

  reply.send(rows);
});

/**
 * GET /api/sectors/:sector
 * All stocks within one sector, same shape as /api/stocks, so the
 * frontend can reuse the same card component.
 */
fastify.get("/api/sectors/:sector", async (request, reply) => {
  const { sector } = request.params;

  const { rows } = await pool.query(
    `
    WITH ranked AS (
      SELECT
        stock_id, trade_date, close_price, volume, avg_volume_20d, avg_volume_50d,
        LAG(close_price) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_close,
        LAG(volume) OVER (PARTITION BY stock_id ORDER BY trade_date) AS prev_volume,
        ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY trade_date DESC) AS rn
      FROM daily_history
    ),
    latest AS (
      SELECT * FROM ranked WHERE rn = 1
    )
    SELECT
      s.stock_id, s.ticker, s.company_name, s.cap_tier, s.cap_rank, s.sector,
      l.close_price, l.prev_close, l.volume, l.prev_volume,
      l.avg_volume_20d, l.avg_volume_50d,
      ROUND(((l.close_price - l.prev_close) / l.prev_close * 100)::numeric, 2) AS pct_change,
      ROUND((l.volume::numeric / NULLIF(l.avg_volume_20d, 0)), 2) AS rvol_20d,
      ROUND((l.volume::numeric / NULLIF(l.avg_volume_50d, 0)), 2) AS rvol_50d,
      (
        l.close_price > l.prev_close
        AND l.volume > l.prev_volume
        AND l.volume > l.avg_volume_20d
        AND l.volume > l.avg_volume_50d
      ) AS breakout
    FROM stocks s
    JOIN latest l ON l.stock_id = s.stock_id
    WHERE s.sector = $1 AND s.is_tracked = TRUE
    ORDER BY pct_change DESC
    `,
    [sector]
  );

  reply.send(rows);
});

/**
 * GET /api/briefing
 * The daily briefing: signal labels for every stock, today's biggest
 * movers, global index context, recent news, recent corporate
 * announcements, and any verified person/stock connections that
 * appear in today's news. Every section here is either a stored fact
 * or a transparent rule output -- nothing here is a prediction.
 */
fastify.get("/api/briefing", async (request, reply) => {
  const [signals, globalIndices, recentNews, recentAnnouncements, connections] = await Promise.all([
    pool.query(`SELECT * FROM stock_signals ORDER BY pct_change DESC NULLS LAST`),
    pool.query(`
      SELECT gi.index_code, gi.display_name, gi.country, gih.trade_date, gih.close_value, gih.pct_change
      FROM global_index_history gih
      JOIN global_indices gi ON gi.id = gih.index_id
      WHERE gih.trade_date = (SELECT MAX(trade_date) FROM global_index_history)
      ORDER BY gi.country, gi.index_code
    `),
    pool.query(`
      SELECT n.headline, n.source_name, n.source_url, n.published_at, s.ticker
      FROM news_items n
      JOIN stocks s ON s.stock_id = n.stock_id
      ORDER BY n.published_at DESC
      LIMIT 20
    `),
    pool.query(`
      SELECT ca.subject, ca.category, ca.announcement_date, ca.attachment_url, s.ticker
      FROM corporate_announcements ca
      JOIN stocks s ON s.stock_id = ca.stock_id
      ORDER BY ca.announcement_date DESC
      LIMIT 20
    `),
    pool.query(`
      SELECT p.full_name, l.relationship, l.description, l.confidence, s.ticker
      FROM person_stock_links l
      JOIN people p ON p.person_id = l.person_id
      JOIN stocks s ON s.stock_id = l.stock_id
      ORDER BY l.added_at DESC
    `),
  ]);

  // Sector-level exposure note for any IT/Pharma stocks, given today's
  // global index moves -- a static, documented relationship, not a
  // computed forecast.
  const bigGlobalMove = globalIndices.rows.some((r) => Math.abs(Number(r.pct_change)) >= 1.5);

  reply.send({
    signals: signals.rows,
    global_indices: globalIndices.rows,
    big_global_move: bigGlobalMove,
    recent_news: recentNews.rows,
    recent_announcements: recentAnnouncements.rows,
    connections: connections.rows,
  });
});

fastify.listen({ port: process.env.PORT || 4001, host: "0.0.0.0" });
