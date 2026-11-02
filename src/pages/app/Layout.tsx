import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Building2, FileText, Inbox, LayoutGrid, Link2, Settings, ShieldAlert, Users } from "lucide-react";
import { Crest, Logo } from "@/components/brand";
import { actions, signOut, useDB, useStore } from "@/lib/store";
import { daysLeft, elapsed, stats } from "@/lib/derive";
import { toast } from "@/components/toast";

const NAV = [
  ["/app", "Overview", LayoutGrid],
  ["/app/students", "Students", Users],
  ["/app/requests", "Parent requests", Inbox],
  ["/app/ledger", "Consent ledger", Link2],
  ["/app/breach", "Breaches", ShieldAlert],
  ["/app/vendors", "Vendors", Building2],
  ["/app/report", "Compliance report", FileText],
  ["/app/settings", "School settings", Settings],
] as const;

export default function AppLayout() {
  const db = useDB()!;
  const { mode, user } = useStore();
  const live = mode === "live";
  const st = stats(db);
  const loc = useLocation();
  const nav = useNavigate();
  const path = loc.pathname.replace(/\/$/, "") || "/";
  const title = NAV.find(([to]) => to === path)?.[1] ?? "Overview";

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col items-stretch gap-2.5 border-b border-line bg-white px-4 py-3 md:sticky md:top-0 md:h-screen md:gap-5 md:border-b-0 md:border-r md:px-3.5 md:py-5">
        <div className="px-1.5"><Logo to="/" /></div>
        <div className="hidden items-center gap-2.5 rounded-xl border border-line p-2.5 md:flex">
          <Crest name={db.school.name} />
          <div className="min-w-0"><div className="text-[13px] font-semibold leading-tight">{db.school.name}</div><div className="font-mono text-[11px] text-muted-2">{db.school.slug}.sahmati.in</div></div>
        </div>
        <nav className="-mx-4 flex min-w-0 gap-0.5 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0" aria-label="Console">
          {NAV.map(([to, label, Icon]) => {
            const isActive = path === to;
            return (
              <Link key={to} to={to} className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13.5px] ${isActive ? "bg-subtle font-semibold text-ink" : "font-medium text-muted hover:bg-subtle hover:text-ink"}`}>
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {label}
                {to === "/app/requests" && st.open > 0 && <span className="ml-auto rounded-full bg-amber-soft px-1.5 font-mono text-[11px] text-amber-ink">{st.open}</span>}
                {to === "/app/breach" && st.openBreaches > 0 && <span className="ml-auto rounded-full bg-danger-soft px-1.5 font-mono text-[11px] text-danger">{st.openBreaches}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden flex-col gap-2.5 md:flex">
          <div className="flex flex-col gap-1.5 rounded-xl border border-line p-3">
            <span className="eyebrow">Full compliance due</span>
            <span className="text-[22px] font-semibold tracking-[-0.02em]">{daysLeft()} days</span>
            <span className="h-1 overflow-hidden rounded-full bg-track"><span className="block h-full bg-amber" style={{ width: `${elapsed() * 100}%` }} /></span>
            <span className="font-mono text-[11px] text-muted-2">13 MAY 2027</span>
          </div>
          <div className="flex items-center gap-2.5 px-1.5 text-[13px]">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-green-soft text-[11px] font-bold text-green">{live ? (user?.email ?? "S").slice(0, 2).toUpperCase() : "PR"}</span>
            {live ? (
              <div className="min-w-0"><div className="truncate font-semibold">{user?.email}</div><button className="font-mono text-[11px] text-muted-2 hover:text-ink" onClick={() => signOut()}>Sign out</button></div>
            ) : (
              <div><div className="font-semibold">Principal's office</div><div className="font-mono text-[11px] text-muted-2">Admin</div></div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-7">
            <div className="flex items-center gap-2 text-[13px] text-muted-2"><span className="hidden sm:inline">{db.school.name}</span><span className="hidden sm:inline">/</span><b className="font-semibold text-ink">{title}</b></div>
            <span className="ml-auto hidden items-center gap-2 rounded-full sm:inline-flex border border-line bg-white px-2.5 py-1 font-mono text-[11px] text-muted-2">{live ? <><span className="h-1.5 w-1.5 rounded-full bg-brand" />Live · synced</> : <><span className="h-1.5 w-1.5 rounded-full bg-muted-3" />Sample school · demo data</>}</span>
            <button className="btn btn-danger btn-sm" onClick={() => nav({ to: "/app/breach", search: { new: 1 } })}><AlertTriangle className="h-3.5 w-3.5" />Report a data breach</button>
            {live ? (
              <button className="btn btn-ghost btn-sm md:hidden" onClick={() => signOut()}>Sign out</button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={async () => { await actions.reset(); toast("Demo data reset"); }}>Reset demo</button>
            )}
          </div>
        </div>
        <main className="flex w-full max-w-[1180px] flex-col gap-5 px-4 pb-20 pt-7 sm:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHead({ n, label, title, desc, children }: { n: string; label: string; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-[720px] flex-col gap-2">
        <span className="eyebrow">{n} · {label}</span>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {desc && <p className="text-muted">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
