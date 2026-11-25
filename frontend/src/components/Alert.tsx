import type { ReactNode } from "react";

type AlertKind = "error" | "success" | "info";

export function Alert({ kind = "info", children }: { kind?: AlertKind; children: ReactNode }) {
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
