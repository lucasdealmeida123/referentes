interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: number; positive: boolean };
  accent?: string;
  highlight?: "blue" | "green" | "orange" | "purple" | "red";
}

const HIGHLIGHT_COLORS: Record<NonNullable<Props["highlight"]>, { bg: string; border: string }> = {
  blue:   { bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.22)" },
  green:  { bg: "rgba(34,197,94,0.06)",   border: "rgba(34,197,94,0.22)" },
  orange: { bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.22)" },
  purple: { bg: "rgba(168,85,247,0.06)",  border: "rgba(168,85,247,0.22)" },
  red:    { bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.22)" },
};

export function KpiCard({ label, value, sub, icon, iconBg, iconColor, trend, highlight }: Props) {
  const hl = highlight ? HIGHLIGHT_COLORS[highlight] : null;
  return (
    <div className="kpi-card" style={hl ? { background: hl.bg, borderColor: hl.border } : undefined}>
      <div className="kpi-card-header">
        <span className="kpi-label">{label}</span>
        {icon && (
          <div className="kpi-icon" style={{
            background: iconBg || "rgba(59,130,246,0.12)",
            color: iconColor || "var(--accent)",
          }}>
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-meta">
        {trend && (
          <span className={`kpi-trend ${trend.positive ? "up" : "down"}`}>
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}
