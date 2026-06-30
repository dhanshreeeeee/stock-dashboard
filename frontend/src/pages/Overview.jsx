import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStocks } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import BreakoutFlag from "../components/BreakoutFlag";

const TIERS = [
  { value: "", label: "All tiers" },
  { value: "large", label: "Large cap" },
  { value: "mid", label: "Mid cap" },
  { value: "small", label: "Small cap" },
];

const SORT_OPTIONS = [
  { value: "cap_rank", label: "Cap rank" },
  { value: "pct_change", label: "% change" },
  { value: "rvol_20d", label: "RVOL (20d)" },
];

export default function Overview() {
  const [tier, setTier] = useState("");
  const [sortBy, setSortBy] = useState("pct_change");
  const [sortDir, setSortDir] = useState("desc");

  // User-controlled filter conditions -- this replaces a single combined
  // score. Each toggle is one transparent condition; the person decides
  // which to stack together.
  const [onlyPriceUp, setOnlyPriceUp] = useState(false);
  const [onlyAboveBoth20And50, setOnlyAboveBoth20And50] = useState(false);
  const [minRvol, setMinRvol] = useState("");

  const {
    data: stocks,
    loading,
    error,
    lastUpdated,
  } = usePolling(() => fetchStocks(tier || undefined), {
    intervalMs: 2000,
    deps: [tier],
  });

  const filtered = useMemo(() => {
    let rows = [...(stocks || [])];

    if (onlyPriceUp) {
      rows = rows.filter((r) => Number(r.pct_change) > 0);
    }
    if (onlyAboveBoth20And50) {
      rows = rows.filter(
        (r) => Number(r.rvol_20d) > 1 && Number(r.rvol_50d) > 1
      );
    }
    if (minRvol !== "" && !Number.isNaN(Number(minRvol))) {
      rows = rows.filter((r) => Number(r.rvol_20d) >= Number(minRvol));
    }

    rows.sort((a, b) => {
      const av = Number(a[sortBy]);
      const bv = Number(b[sortBy]);
      const cmp = av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [stocks, onlyPriceUp, onlyAboveBoth20And50, minRvol, sortBy, sortDir]);

  const breakoutCount = filtered.filter((s) => s.breakout).length;

  return (
    <div style={styles.page}>
      <header style={styles.headerRow}>
        <div>
          <h1 className="display" style={styles.title}>
            Stock monitor
          </h1>
          <p style={styles.subtitle}>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {filtered.length}
            </span>{" "}
            of {stocks?.length ?? 0} tracked
            {breakoutCount > 0 && (
              <>
                {" "}
                ·{" "}
                <span style={{ color: "var(--up)", fontWeight: 600 }}>
                  {breakoutCount} breaking out
                </span>
              </>
            )}
          </p>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.liveIndicator}>
            <span className="live-dot" style={styles.liveDot} />
            {lastUpdated
              ? `updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "connecting..."}
          </span>
          <Link to="/briefing" className="sectors-link" style={styles.sectorsLink}>
            Daily briefing →
          </Link>
          <Link to="/sectors" className="sectors-link" style={styles.sectorsLink}>
            View sectors →
          </Link>
        </div>
      </header>

      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Tier</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)} style={styles.select}>
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Sort by</label>
          <div style={{ display: "flex", gap: 6 }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              className="icon-btn"
              style={styles.dirButton}
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label="Toggle sort direction"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <button
          className={`chip${onlyPriceUp ? " chip-active" : ""}`}
          onClick={() => setOnlyPriceUp((v) => !v)}
          style={styles.chip}
        >
          Price up today
        </button>

        <button
          className={`chip${onlyAboveBoth20And50 ? " chip-active" : ""}`}
          onClick={() => setOnlyAboveBoth20And50((v) => !v)}
          style={styles.chip}
        >
          Volume above 20d &amp; 50d avg
        </button>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Min RVOL</label>
          <input
            type="number"
            step="0.1"
            placeholder="1.5"
            value={minRvol}
            onChange={(e) => setMinRvol(e.target.value)}
            style={styles.numberInput}
          />
        </div>
      </div>

      {loading && <p style={styles.statusText}>Loading...</p>}
      {error && <p style={{ ...styles.statusText, color: "var(--down)" }}>{error}</p>}

      {!loading && !error && (
        <div style={styles.grid}>
          {filtered.map((s, i) => {
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
                      {s.is_live && (
                        <span className="live-pulse" style={styles.liveDotInline} title="Live price" />
                      )}
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
        .stock-card {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px 20px;
          opacity: 0;
          animation: fadeSlideUp 0.4s var(--ease-out) forwards;
          transition: transform 0.25s var(--ease-spring), border-color 0.2s ease, box-shadow 0.25s ease;
          position: relative;
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
        .chip {
          background: var(--surface-raised);
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.18s var(--ease-out);
        }
        .chip:hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }
        .chip-active {
          background: var(--accent-bg);
          border-color: var(--accent);
          color: var(--accent-bright);
        }
        .sectors-link {
          transition: opacity 0.15s ease;
        }
        .sectors-link:hover {
          opacity: 0.75;
        }
        .live-dot {
          animation: livePulse 2s ease-in-out infinite;
        }
        .live-pulse {
          animation: livePulse 2s ease-in-out infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .icon-btn {
          transition: all 0.15s ease;
        }
        .icon-btn:hover {
          background: var(--surface-hover);
          border-color: var(--border-strong);
        }
        .icon-btn:active {
          transform: scale(0.92);
        }
        select:focus, input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px var(--accent-bg);
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 12,
  },
  sectorsLink: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--accent-bright)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-muted)",
    fontFamily: "var(--font-display)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--up)",
    boxShadow: "0 0 6px var(--up)",
    display: "inline-block",
  },
  liveDotInline: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--accent-bright)",
    boxShadow: "0 0 6px var(--accent-bright)",
    display: "inline-block",
    marginLeft: 8,
    verticalAlign: "middle",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginTop: 6,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-end",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px 20px",
    marginBottom: 24,
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
  },
  select: {
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    transition: "border-color 0.15s ease",
  },
  numberInput: {
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    width: 90,
    fontFamily: "var(--font-display)",
    transition: "border-color 0.15s ease",
  },
  dirButton: {
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "9px 14px",
    fontSize: 14,
  },
  chip: {
    height: 38,
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
