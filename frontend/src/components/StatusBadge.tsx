type Status = "critico" | "parcial" | "optimo" | "info" | string;

const MAP: Record<string, { cls: string; label: string }> = {
  critico: { cls: "badge-critical", label: "Crítico" },
  parcial: { cls: "badge-partial",  label: "Parcial" },
  optimo:  { cls: "badge-optimal",  label: "Óptimo"  },
  info:    { cls: "badge-info",     label: "Info"    },
};

interface Props {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label }: Props) {
  const def = MAP[status] ?? { cls: "badge-neutral", label: status };
  return (
    <span className={`badge ${def.cls}`}>
      {label ?? def.label}
    </span>
  );
}
