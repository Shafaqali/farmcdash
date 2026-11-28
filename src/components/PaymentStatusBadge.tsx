import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
export function PaymentStatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const paid = status === "Paid";
  const partial = status.toLowerCase().startsWith("partial");
  const Icon = paid ? CheckCircle2 : partial ? Clock3 : CircleAlert;
  const colour = paid ? "border-success/25 bg-success/10 text-success" : partial ? "border-warning/25 bg-warning/10 text-warning" : "border-destructive/25 bg-destructive/10 text-destructive";
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${colour}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{children ?? status}</span></span>;
}
