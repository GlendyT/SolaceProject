import { CheckCircle2, Clock3, XCircle } from "lucide-react";

const styles = {
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
} as const;

export function StatusBadge({
  status,
}: {
  status: "accepted" | "cancelled" | "pending";
}) {
  const content = {
    accepted: { label: "Accepted", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", icon: XCircle },
    pending: { label: "Procesando", icon: Clock3 },
  }[status];
  const Icon = content.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${styles[status]}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {content.label}
    </span>
  );
}
