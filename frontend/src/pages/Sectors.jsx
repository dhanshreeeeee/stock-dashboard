import { Link } from "react-router-dom";
import { fetchSectors } from "../api/client";
import { usePolling } from "../hooks/usePolling";

export default function Sectors() {
  const { data: sectors, loading, error } = usePolling(fetchSectors, { intervalMs: 2000 });

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/" className="back-link" style={styles.backLink}>
          ← Back to overview
        </Link>
        <h1 className="display" style={styles.title}>
          Sectors
        </h1>
        <p style={styles.subtitle}>How each category is moving today, ranked by average change</p>
      </header>

      {loading && <p style={styles.statusText}>Loading...</p>}
      {error && <p style={{ ...styles.statusText, color: "var(--down)" }}>{error}</p>}

      {!loading && !error && (
        <div style={styles.grid}>
          {(sectors || []).map((s, i) => {
            const avgChange = Number(s.avg_pct_change);
            const isUp = avgChange > 0;
            const isDown = avgChange < 0;
            const changeColor = isUp ? "var(--up)" : isDown ? "var(--down)" : "var(--text-secondary)";
            const upRatio = Number(s.up_count) / Number(s.stock_count);

            return (
              <Link
                key={s.sector}
                to={`/sectors/${encodeURIComponent(s.sector)}`}
                className="sector-card"
                style={{ ...styles.card, animationDelay: `${Math.min(i * 25, 400)}ms` }}
              >
                <div style={styles.cardTop}>
                  <div className="display" style={styles.sectorName}>
                    {s.sector}
                  </div>
                  <span style={styles.countBadge}>{s.stock_count} stocks</span>
                </div>

                <div className="display" style={{ ...styles.heroChange, color: changeColor }}>
                  {isUp ? "+" : ""}
                  {avgChange.toFixed(2)}%
                </div>

                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${upRatio * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.barLabel}>
                  <span className="text-up display">{s.up_count} up</span>
                  <span className="text-muted">·</span>
                  <span className="text-down display">{s.down_count} down</span>
                </div>

                <div style={styles.cardBottom}>
                  <span style={styles.metaTag}>
                    avg RVOL <span className="display">{s.avg_rvol_20d ?? "—"}</span>
                  </span>
                  {Number(s.breakout_count) > 0 && (
                    <span style={styles.breakoutTag}>{s.breakout_count} breaking out</span>
                  )}
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
        .sector-card {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px 22px;
          opacity: 0;
          animation: fadeSlideUp 0.4s var(--ease-out) forwards;
          transition: transform 0.25s var(--ease-spring), border-color 0.2s ease, box-shadow 0.25s ease;
        }
        .sector-card:hover {
          transform: translateY(-4px) scale(1.015);
          border-color: var(--border-strong);
          box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.5);
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
  header: {
    marginBottom: 28,
  },
  backLink: {
    fontSize: 13,
    color: "var(--text-secondary)",
    display: "inline-block",
    marginBottom: 16,
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
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
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
  sectorName: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  countBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "var(--surface-raised)",
    padding: "3px 9px",
    borderRadius: 999,
    flexShrink: 0,
  },
  heroChange: {
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: 14,
    letterSpacing: "-0.02em",
  },
  barTrack: {
    height: 6,
    background: "var(--down-bg)",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  barFill: {
    height: "100%",
    background: "var(--up)",
    borderRadius: 999,
    transition: "width 0.4s var(--ease-out)",
  },
  barLabel: {
    display: "flex",
    gap: 6,
    fontSize: 12,
    marginBottom: 16,
  },
  cardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaTag: {
    fontSize: 11,
    color: "var(--text-muted)",
  },
  breakoutTag: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--up)",
    background: "var(--up-bg)",
    padding: "3px 9px",
    borderRadius: 999,
  },
};
