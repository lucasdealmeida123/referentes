interface Props {
  criticas: number;
  parciales: number;
  optimas: number;
  showLegend?: boolean;
}

export function CoverageBar({ criticas, parciales, optimas, showLegend = true }: Props) {
  const total = criticas + parciales + optimas;
  if (total === 0) return <div className="text-muted text-sm">Sin datos</div>;

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="coverage-bar-wrap">
      <div className="coverage-bar-track">
        <div
          className="coverage-bar-segment"
          style={{ width: pct(criticas), background: "var(--status-critical)" }}
        />
        <div
          className="coverage-bar-segment"
          style={{ width: pct(parciales), background: "var(--status-partial)" }}
        />
        <div
          className="coverage-bar-segment"
          style={{ width: pct(optimas), background: "var(--status-optimal)" }}
        />
      </div>
      {showLegend && (
        <div className="coverage-bar-legend">
          <div className="coverage-bar-legend-item">
            <div className="coverage-bar-legend-dot" style={{ background: "var(--status-critical)" }} />
            Críticas · {criticas}
          </div>
          <div className="coverage-bar-legend-item">
            <div className="coverage-bar-legend-dot" style={{ background: "var(--status-partial)" }} />
            Parciales · {parciales}
          </div>
          <div className="coverage-bar-legend-item">
            <div className="coverage-bar-legend-dot" style={{ background: "var(--status-optimal)" }} />
            Óptimas · {optimas}
          </div>
        </div>
      )}
    </div>
  );
}
