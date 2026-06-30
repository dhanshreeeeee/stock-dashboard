import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { fetchStockDetail, fetchStockNews } from "../api/client";
import BreakoutFlag from "../components/BreakoutFlag";

export default function StockDetail() {
  const { ticker } = useParams();
  const [stock, setStock] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchStockDetail(ticker), fetchStockNews(ticker)])
      .then(([stockData, newsData]) => {
        setStock(stockData);
        setNews(newsData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return <div style={styles.page}><p style={styles.statusText}>Loading...</p></div>;
  if (error) return <div style={styles.page}><p style={{ color: "var(--down)" }}>{error}</p></div>;
  if (!stock) return null;

  const chartData = stock.history.map((h) => ({
    date: h.trade_date.slice(0, 10),
    close: Number(h.close_price),
    volume: Number(h.volume),
    avgVolume20d: h.avg_volume_20d ? Number(h.avg_volume_20d) : null,
  }));

  const m = stock.metrics || {};
  const pctChange = m.pct_change !== undefined && m.pct_change !== null ? Number(m.pct_change) : null;
  const changeColor =
    pctChange > 0 ? "var(--up)" : pctChange < 0 ? "var(--down)" : "var(--text-secondary)";

  return (
    <div style={styles.page}>
      <Link to="/" className="back-link" style={styles.backLink}>
        ← Back to overview
      </Link>

      <header style={styles.header}>
        <div>
          <h1 className="display" style={styles.title}>
            {stock.ticker}
          </h1>
          <p style={styles.companyName}>{stock.company_name}</p>
        </div>
        <div style={styles.priceBlock}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <div className="display" style={styles.price}>
              ₹{Number(m.close_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            {m.is_live && (
              <span className="live-pulse" style={styles.liveBadge}>
                LIVE
              </span>
            )}
          </div>
          {pctChange !== null && (
            <div className="display" style={{ fontSize: 15, fontWeight: 700, color: changeColor }}>
              {pctChange > 0 ? "+" : ""}
              {pctChange.toFixed(2)}%
            </div>
          )}
        </div>
      </header>

      <section className="panel" style={styles.chartCard}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              yAxisId="price"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <YAxis
              yAxisId="volume"
              orientation="right"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-secondary)" }}
            />
            <Bar yAxisId="volume" dataKey="volume" fill="var(--border-strong)" barSize={4} radius={[2, 2, 0, 0]} />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="var(--accent-bright)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section style={styles.metricsGrid}>
        <MetricCard label="Prev close" value={`₹${Number(m.prev_close).toFixed(2)}`} />
        <MetricCard label="Volume today" value={Number(m.volume).toLocaleString("en-IN")} />
        <MetricCard label="Prev day volume" value={Number(m.prev_volume).toLocaleString("en-IN")} />
        <MetricCard label="20d avg volume" value={Number(m.avg_volume_20d).toLocaleString("en-IN")} />
        <MetricCard label="50d avg volume" value={Number(m.avg_volume_50d).toLocaleString("en-IN")} />
        <MetricCard
          label="Price vs 20d avg"
          value={m.price_vs_20d_pct !== null ? `${m.price_vs_20d_pct > 0 ? "+" : ""}${m.price_vs_20d_pct}%` : "—"}
          highlight={m.price_vs_20d_pct > 0 ? "up" : m.price_vs_20d_pct < 0 ? "down" : null}
        />
        <MetricCard label="RVOL (20d)" value={m.rvol_20d ?? "—"} />
        <MetricCard label="RVOL (50d)" value={m.rvol_50d ?? "—"} />
      </section>

      <section className="panel" style={styles.signalSection}>
        <div style={styles.signalLabel}>Breakout rule</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <BreakoutFlag breakout={m.breakout} />
          <span style={styles.signalDesc}>
            price up &amp; volume above yesterday, 20d avg, and 50d avg — all required together
          </span>
        </div>
      </section>

      {(stock.business_summary || stock.ceo_name || stock.promoter_holding_pct) && (
        <section style={styles.profileSection}>
          <h2 className="display" style={styles.sectionTitle}>
            Company profile
          </h2>
          {stock.business_summary && <p style={styles.profileText}>{stock.business_summary}</p>}
          <div style={styles.profileGrid}>
            {stock.ceo_name && <MetricCard label="CEO" value={stock.ceo_name} />}
            {stock.md_name && <MetricCard label="MD" value={stock.md_name} />}
            {stock.promoter_holding_pct && (
              <MetricCard label="Promoter holding" value={`${stock.promoter_holding_pct}%`} />
            )}
            {stock.promoter_pledge_pct && (
              <MetricCard label="Promoter pledge" value={`${stock.promoter_pledge_pct}%`} />
            )}
          </div>
        </section>
      )}

      <section style={styles.newsSection}>
        <h2 className="display" style={styles.sectionTitle}>
          Recent news
        </h2>
        {news.length === 0 ? (
          <div className="panel" style={styles.emptyNews}>
            <div style={styles.emptyNewsIcon}>＋</div>
            <p style={styles.emptyNewsTitle}>No news connected yet</p>
            <p style={styles.emptyNewsBody}>
              This feed populates once a news source is wired up for {stock.ticker}. Headlines, sentiment,
              and links will show up here automatically.
            </p>
          </div>
        ) : (
          <ul style={styles.newsList}>
            {news.map((n, i) => (
              <li key={i} className="panel news-item" style={styles.newsItem}>
                <a href={n.source_url} target="_blank" rel="noreferrer" style={styles.newsHeadline}>
                  {n.headline}
                </a>
                <div style={styles.newsMeta}>
                  {n.source_name} · {n.published_at ? n.published_at.slice(0, 10) : ""}
                </div>
                {n.summary && <p style={styles.newsSummary}>{n.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <style>{`
        .back-link {
          transition: color 0.15s ease;
        }
        .back-link:hover {
          color: var(--text-primary);
        }
        .live-pulse {
          animation: livePulse 2s ease-in-out infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .panel {
          transition: border-color 0.2s ease;
        }
        .news-item {
          transition: border-color 0.2s ease, transform 0.2s var(--ease-out);
        }
        .news-item:hover {
          border-color: var(--border-strong);
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
}

function MetricCard({ label, value, highlight }) {
  return (
    <div className="panel" style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div
        className="display"
        style={{
          ...styles.metricValue,
          color:
            highlight === "up" ? "var(--up)" : highlight === "down" ? "var(--down)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 920,
    margin: "0 auto",
    padding: "40px 24px 64px",
  },
  backLink: {
    fontSize: 13,
    color: "var(--text-secondary)",
    display: "inline-block",
    marginBottom: 24,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  companyName: {
    fontSize: 14,
    color: "var(--text-secondary)",
    margin: "6px 0 0",
  },
  priceBlock: {
    textAlign: "right",
  },
  liveBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--accent-bright)",
    background: "var(--accent-bg)",
    padding: "2px 7px",
    borderRadius: 999,
    letterSpacing: "0.05em",
  },
  price: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  chartCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 10px",
    marginBottom: 28,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 28,
  },
  metricCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px 16px",
  },
  metricLabel: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 600,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 600,
  },
  signalSection: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "18px 20px",
    marginBottom: 28,
  },
  signalLabel: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 600,
    marginBottom: 10,
  },
  signalDesc: {
    fontSize: 13,
    color: "var(--text-secondary)",
  },
  profileSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 14,
    letterSpacing: "-0.01em",
  },
  profileText: {
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    marginBottom: 14,
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 12,
  },
  newsSection: {},
  newsList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  newsItem: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px 18px",
  },
  newsHeadline: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  newsMeta: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 5,
  },
  newsSummary: {
    fontSize: 13,
    color: "var(--text-secondary)",
    marginTop: 10,
    lineHeight: 1.5,
  },
  emptyNews: {
    background: "var(--surface)",
    border: "1px dashed var(--border-strong)",
    borderRadius: "var(--radius)",
    padding: "32px 24px",
    textAlign: "center",
  },
  emptyNewsIcon: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "var(--accent-bg)",
    color: "var(--accent-bright)",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  emptyNewsTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "0 0 6px",
  },
  emptyNewsBody: {
    fontSize: 13,
    color: "var(--text-muted)",
    margin: 0,
    maxWidth: 380,
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.5,
  },
  statusText: {
    color: "var(--text-secondary)",
    fontSize: 14,
  },
};
