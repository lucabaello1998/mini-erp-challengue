const labels: Record<string, string> = {
  Borrador: "Borrador",
  Aprobado: "Aprobado",
  Rechazado: "Rechazado",
  Facturado: "Facturado",
};

export function StatusBadge({ estado }: { estado: string }) {
  return <span className={`badge badge-${estado.toLowerCase()}`}>{labels[estado] ?? estado}</span>;
}
