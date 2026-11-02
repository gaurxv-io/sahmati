import { Link } from "@tanstack/react-router";
import type { ConsentStatus } from "@/lib/types";

const SHIELD = (
  <>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </>
);

export function ShieldIcon({ className = "h-[18px] w-[18px]", stroke = "#04130B", width = 2.2 }: { className?: string; stroke?: string; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {SHIELD}
    </svg>
  );
}

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 text-ink hover:text-ink">
      <span className="grid h-[30px] w-[30px] place-items-center rounded-[7px] bg-brand">
        <ShieldIcon />
      </span>
      <span className="text-lg font-bold tracking-[-0.02em]">Sahmati</span>
    </Link>
  );
}

export function Seal({ earned, size = "md" }: { earned: boolean; size?: "md" | "lg" | "xl" }) {
  const dims = { md: "h-28 w-28 gap-1", lg: "h-40 w-40 gap-2", xl: "h-60 w-60 gap-2.5" }[size];
  const icon = { md: "h-6 w-6", lg: "h-8 w-8", xl: "h-11 w-11" }[size];
  const title = { md: "text-[13px]", lg: "text-base", xl: "text-xl" }[size];
  const sub = { md: "text-[9px]", lg: "text-[10px]", xl: "text-[11px]" }[size];
  return (
    <div
      role="img"
      aria-label={`DPDP Ready School badge ${earned ? "earned" : "not yet earned"}`}
      className={`flex shrink-0 flex-col items-center justify-center rounded-full text-center ${dims} ${earned ? "border border-green-line bg-green-soft" : "border border-dashed border-line-2 bg-subtle"}`}
    >
      <ShieldIcon className={icon} stroke={earned ? "#047A44" : "#727B76"} width={1.8} />
      <b className={`${title} font-bold tracking-[-0.02em] ${earned ? "text-ink" : "text-muted-3"}`}>DPDP Ready</b>
      <span className={`font-mono ${sub} ${earned ? "text-green" : "text-muted-3"}`}>SCHOOL · 2027</span>
    </div>
  );
}

const PILL: Record<string, [string, string]> = {
  given: ["Consent given", "bg-green-soft text-green"],
  pending: ["Pending", "bg-amber-soft text-amber-ink"],
  withdrawn: ["Optional withdrawn", "bg-subtle text-muted"],
  renewal: ["Renewal pending", "bg-amber-soft text-amber-ink"],
  open: ["Open", "bg-amber-soft text-amber-ink"],
  done: ["Resolved", "bg-green-soft text-green"],
  late: ["Overdue", "bg-danger-soft text-danger"],
  met: ["Met", "bg-green-soft text-green"],
  unmet: ["Open", "bg-amber-soft text-amber-ink"],
};
export function Pill({ kind, label }: { kind: ConsentStatus | "open" | "done" | "late" | "met" | "unmet"; label?: string }) {
  const [text, cls] = PILL[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-2 pr-2.5 text-xs font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? text}
    </span>
  );
}

export function Crest({ name, className = "" }: { name: string; className?: string }) {
  const ini = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line-2 bg-subtle text-[13px] font-bold text-ink ${className}`}>{ini}</span>;
}
