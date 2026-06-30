import { Link } from "react-router-dom";
import { fetchBriefing } from "../api/client";
import { usePolling } from "../hooks/usePolling";

const SIGNAL_STYLES = {
  Bullish: { color: "var(--up)", bg: "var(--up-bg)" },
  Bearish: { color: "var(--down)", bg: "var(--down-bg)" },
  Mixed: { color: "var(--text-secondary)", bg: "var(--surface-raised)" },
  "Insufficient data": { color: "var(--text-muted)", bg: "var(--surface-raised)" },
};

export default function Briefing() {
  const { data, loading, error } = usePolling(fetchBriefing, { intervalMs: 30000 });

  if (loading) return <div style={styles.page}><p style={styles.statusText}>Loading briefing...</p></div>;
  if (error) return <div style={styles.page}><p style={{ color: "var(--down)" }}>{error}</p></div>;
  if (!data) return null;

  const bullish = data.signals.filter((s) => s.signal === "Bullish");
  const bearish = data.signals.filter((s) => s.signal === "Bearish");

  return (
    <div style={styles.page}>
      <Link to="/" className="back-link" style={styles.backLink}>
        ← Back to overview
      </Link>

      <header style={styles.header}>
        <h1 className="display" style={styles.title}>
          Daily briefing
        </h1>
        <p style={styles.subtitle}>
          {bullish.length} bullish · {bearish.length} bearish · {data.signals.length} tracked
        </p>
      </header>

      {/* Global context */}
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>Global markets (last close)</h2>
        <div style={styles.globalGrid}>
          {data.global_indices.length === 0 ? (
            <p style={styles.emptyNote}>No global index data loaded yet.</p>
          ) : (
            data.global_indices.map((idx) => {
              const pct = Number(idx.pct_change);
              const color = pct > 0 ? "var(--up)" : pct < 0 ? "var(--down)" : "var(--text-secondary)";
              return (
                <div key={idx.index_code} className="panel" style={styles.globalCard}>
                  <div style={styles.globalName}>{idx.display_name}</div>
                  <div style={styles.globalCountry}>{idx.country}</div>
                  <div className="display" style={{ ...styles.globalChange, color }}>
                    {pct > 0 ? "+" : ""}
                    {pct?.toFixed(2)}%
                  </div>
                </div>
              );
            })
          )}
        </div>
        {data.big_global_move && (
          <p style={styles.globalWarning}>
            ⚠ A global index moved more than 1.5% — IT and Pharma stocks have direct US revenue/regulatory
            exposure and may react.
          </p>
        )}
      </section>

      {/* Verified connections triggered */}
      {data.connections.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionLabel}>Verified connections on watch</h2>
          <div style={styles.list}>
            {data.connections.map((c, i) => (
              <div key={i} className="panel" style={styles.connectionCard}>
                <div style={styles.connectionTop}>
                  <Link to={`/stock/${c.ticker}`} className="display" style={styles.connectionTicker}>
                    {c.ticker}
                  </Link>
                  <span
                    style={{
                      ...styles.confidenceTag,
                      color: c.confidence === "confirmed" ? "var(--up)" : "var(--text-secondary)",
                    }}
                  >
                    {c.confidence}
                  </span>
                </div>
                <div style={styles.connectionName}>
                  {c.full_name} — {c.relationship.replace("_", " ")}
                </div>
                <p style={styles.connectionDesc}>{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Signals grid */}
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>Signals</h2>
        <div style={styles.signalsGrid}>
          {data.signals.map((s) => {
            const st = SIGNAL_STYLES[s.signal] || SIGNAL_STYLES.Mixed;
            const pct = s.pct_change !== null ? Number(s.pct_change) : null;
            return (
              <Link key={s.stock_id} to={`/stock/${s.ticker}`} className="signal-card" style={styles.signalCard}>
                <div style={styles.signalTop}>
                  <span className="display" style={styles.signalTicker}>
                    {s.ticker}
                  </span>
                  <span style={{ ...styles.signalBadge, color: st.color, background: st.bg }}>{s.signal}</span>
                </div>
                {pct !== null && (
                  <div
                    className="display"
                    style={{ fontSize: 13, color: pct > 0 ? "var(--up)" : pct < 0 ? "var(--down)" : "var(--text-secondary)" }}
                  >
                    {pct > 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* News + announcements side by side */}
      <div style={styles.twoCol}>
        <section style={styles.section}>
          <h2 style={styles.sectionLabel}>Recent news</h2>
          <div style={styles.list}>
            {data.recent_news.length === 0 ? (
              <p style={styles.emptyNote}>No news loaded yet.</p>
            ) : (
              data.recent_news.map((n, i) => (
                <a key={i} href={n.source_url} target="_blank" rel="noreferrer" className="panel feed-item" style={styles.feedItem}>
                  <span style={styles.feedTicker}>{n.ticker}</span>
                  <span style={styles.feedHeadline}>{n.headline}</span>
                  <span style={styles.feedMeta}>{n.source_name}</span>
                </a>
              ))
            )}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionLabel}>Corporate announcements</h2>
          <div style={styles.list}>
            {data.recent_announcements.length === 0 ? (
              <p style={styles.emptyNote}>No announcements loaded yet.</p>
            ) : (
              data.recent_announcements.map((a, i) => (
                <a
                  key={i}
                  href={a.attachment_url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="panel feed-item"
                  style={styles.feedItem}
                >
                  <span style={styles.feedTicker}>{a.ticker}</span>
                  <span style={styles.feedHeadline}>{a.subject}</span>
                  <span style={styles.feedMeta}>{a.category}</span>
                </a>
              ))
            )}
          </div>
        </section>
      </div>

      <style>{`
        .back-link { transition: color 0.15s ease; }
        .back-link:hover { color: var(--text-primary); }
        .signal-card {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          transition: transform 0.2s var(--ease-spring), border-color 0.2s ease;
        }
        .signal-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-strong);
        }
        .feed-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          transition: border-color 0.2s ease, transform 0.2s var(--ease-out);
        }
        .feed-item:hover {
          border-color: var(--border-strong);
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px 64px" },
  backLink: { fontSize: 13, color: "var(--text-secondary)", display: "inline-block", marginBottom: 20 },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginTop: 6 },
  statusText: { color: "var(--text-secondary)", fontSize: 14 },
  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 12,
  },
  globalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 },
  globalCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" },
  globalName: { fontSize: 13, fontWeight: 600, color: "var(--text-primary)" },
  globalCountry: { fontSize: 11, color: "var(--text-muted)", marginTop: 2 },
  globalChange: { fontSize: 18, fontWeight: 700, marginTop: 8 },
  globalWarning: { fontSize: 12, color: "var(--text-secondary)", marginTop: 10 },
  emptyNote: { fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  connectionCard: { background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", padding: "14px 16px" },
  connectionTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  connectionTicker: { fontSize: 15, fontWeight: 700, color: "var(--accent-bright)" },
  confidenceTag: { fontSize: 11, fontWeight: 600, textTransform: "uppercase" },
  connectionName: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 },
  connectionDesc: { fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 },
  signalsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 },
  signalCard: { display: "block" },
  signalTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  signalTicker: { fontSize: 13, fontWeight: 700 },
  signalBadge: { fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  feedItem: { display: "block" },
  feedTicker: { fontSize: 11, fontWeight: 700, color: "var(--accent-bright)" },
  feedHeadline: { fontSize: 13, color: "var(--text-primary)", fontWeight: 500 },
  feedMeta: { fontSize: 11, color: "var(--text-muted)" },
};
