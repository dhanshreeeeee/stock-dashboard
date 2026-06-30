import { useParams, Link } from "react-router-dom";
import { fetchSectorStocks } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import BreakoutFlag from "../components/BreakoutFlag";

export default function SectorDetail() {
  const { sector } = useParams();
  const {
    data: stocks,
    loading,
    error,
  } = usePolling(() => fetchSectorStocks(sector), { intervalMs: 2000, deps: [sector] });

  const stockList = stocks || [];
  const avgChange =
    stockList.length > 0
      ? stockList.reduce((sum, s) => sum + Number(s.pct_change), 0) / stockList.length
      : 0;

  return (
    <div style={styles.page}>
      <Link to="/sectors" className="back-link" style={styles.backLink}>
        ← Back to sectors
      </Link>

      <header style={styles.header}>
        <h1 className="display" style={styles.title}>
          {decodeURIComponent(sector)}
        </h1>
        {!loading && stockList.length > 0 && (
          <p style={styles.subtitle}>
            {stockList.length} stocks · average{" "}
            <span
              className="display"
              style={{ color: avgChange > 0 ? "var(--up)" : "var(--down)", fontWeight: 700 }}
            >
              {avgChange > 0 ? "+" : ""}
              {avgChange.toFixed(2)}%
            </span>{" "}
            today
          </p>
        )}
      </header>

      {loading && <p style={styles.statusText}>Loading...</p>}
      {error && <p style={{ ...styles.statusText, color: "var(--down)" }}>{error}</p>}

      {!loading && !error && (
        <div style={styles.grid}>
          {stockList.map((s, i) => {
            const pctChange = Number(s.pct_change);
            const isUp = pctChange > 0;
            const isDown = pctChange < 0;
            const changeColor = isUp ? "var(--up)" : isDown ? "var(--down)" : "var(--text-secondary)";

            return (
              <Link
                key={s.stock_id}
                to={`/stock/${s.ticker}`}
                className={`stock-card${s.breakout ? " stock-card-breakout" : ""}`}
                style={{ ...styles.card, animationDelay: `${Math.min(i * 18, 400)}ms` }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <div className="display" style={styles.ticker}>
                      {s.ticker}
                    </div>
                    <div style={styles.companyName}>{s.company_name}</div>
                  </div>
                  <span style={styles.tierBadge}>{s.cap_tier}</span>
                </div>

                <div className="display" style={{ ...styles.heroChange, color: changeColor }}>
                  {isUp ? "+" : ""}
                  {pctChange.toFixed(2)}%
                </div>

                <div style={styles.cardBottom}>
                  <span className="display" style={styles.price}>
                    ₹{Number(s.close_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <div style={styles.rvolRow}>
                    <span style={styles.rvolTag}>
                      RVOL <span className="display">{s.rvol_20d ?? "—"}</span>
                    </span>
                    <BreakoutFlag breakout={s.breakout} size="sm" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        .back-link {
          transition: color 0.15s ease;
        }
        .back-link:hover {
          color: var(--text-primary);
        }
        .stock-card {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px 20px;
          opacity: 0;
          animation: fadeSlideUp 0.4s var(--ease-out) forwards;
          transition: transform 0.25s var(--ease-spring), border-color 0.2s ease, box-shadow 0.25s ease;
        }
        .stock-card:hover {
          transform: translateY(-4px) scale(1.015);
          border-color: var(--border-strong);
          box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.5);
        }
        .stock-card-breakout {
          border-color: var(--up);
          animation: fadeSlideUp 0.4s var(--ease-out) forwards, breathe 3s ease-in-out infinite;
        }
        .stock-card-breakout:hover {
          box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.5), 0 0 32px 4px var(--up-glow);
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1320,
    margin: "0 auto",
    padding: "40px 24px 64px",
  },
  backLink: {
    fontSize: 13,
    color: "var(--text-secondary)",
    display: "inline-block",
    marginBottom: 20,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginTop: 6,
  },
  statusText: {
    color: "var(--text-secondary)",
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: 14,
  },
  card: {
    display: "block",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  ticker: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  companyName: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 3,
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tierBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "var(--surface-raised)",
    padding: "3px 9px",
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  heroChange: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: 18,
    letterSpacing: "-0.02em",
  },
  cardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 14,
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  rvolRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  rvolTag: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontWeight: 500,
  },
};
