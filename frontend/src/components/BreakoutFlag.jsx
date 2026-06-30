/**
 * Shows the breakout rule's result plainly: triggered, not triggered, or
 * not enough data yet. Still a single rule's outcome, not a blended
 * "score" -- the filter bar is where the person combines conditions.
 */
export default function BreakoutFlag({ breakout, size = "md" }) {
  const fontSize = size === "sm" ? 11 : 12;
  const padding = size === "sm" ? "3px 8px" : "4px 10px";

  if (breakout === null || breakout === undefined) {
    return (
      <span
        style={{
          fontSize,
          padding,
          borderRadius: 999,
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}
      >
        no data
      </span>
    );
  }

  if (!breakout) {
    return (
      <span
        style={{
          fontSize,
          padding,
          borderRadius: 999,
          color: "var(--text-muted)",
        }}
      >
        —
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize,
        padding,
        borderRadius: 999,
        background: "var(--up-bg)",
        color: "var(--up)",
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--up)",
          boxShadow: "0 0 6px var(--up)",
        }}
      />
      breakout
    </span>
  );
}
