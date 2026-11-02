import { Link } from "@tanstack/react-router";
import { Check, FileText, MessageCircle } from "lucide-react";
import { Pill, Seal } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { shortDate, stats } from "@/lib/derive";
import { PageHead } from "./Layout";
import { ThisWeek } from "./SettingsExtra";

export default function Overview() {
  const db = useDB()!;
  const st = stats(db);
  const tiles = [
    { l: "Consent", v: `${Math.round(st.cov * 100)}%`, c: "text-green", s: <>{st.given + st.withdrawn} of {st.total} students recorded</> },
    { l: "Pending", v: String(st.pending), c: "text-amber-ink", s: <><Link to="/app/students" search={{ status: "pending", remind: "1" }} className="font-semibold">Send reminders</Link>{st.renewal > 0 && <><br /><Link to="/app/students" search={{ status: "renewal" }} className="font-mono text-[11.5px] text-amber-ink">Renewals · {st.renewal} awaiting</Link></>}</> },
    { l: "Parent requests", v: String(st.open), c: "", s: st.late ? <Pill kind="late" label={`${st.late} overdue`} /> : <>Open · none overdue</> },
    { l: "Readiness", v: `${Math.round((st.ready / st.checks.length) * 100)}%`, c: st.ready === st.checks.length ? "text-green" : "", s: <>{st.ready} of {st.checks.length} steps complete</> },
  ];
  return (
    <>
      <PageHead n="01" label="Overview" title={`${db.school.name} at a glance`}>
        <Link to="/app/report" className="btn"><FileText className="h-4 w-4" />Compliance report</Link>
        <Link to="/app/students" search={{ status: "pending", remind: "1" }} className="btn btn-primary"><MessageCircle className="h-4 w-4" />Remind {st.pending} parents</Link>
      </PageHead>

      <ThisWeek />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.l} className="flex flex-col gap-1.5 rounded-xl border border-line bg-white p-4">
            <span className="eyebrow">{t.l}</span>
            <span className={`text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${t.c}`}>{t.v}</span>
            <span className="text-[12.5px] text-muted-2">{t.s}</span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="panel">
          <div className="flex items-center justify-between px-[18px] pt-4"><h2 className="text-base font-semibold">Consent by class group</h2><span className="eyebrow">Recorded</span></div>
          <div className="flex flex-col gap-3 px-[18px] py-4">
            {st.bands.map((b) => (
              <div key={b.name} className="grid grid-cols-[100px_1fr_40px] items-center gap-3 text-[13px]">
                <span>{b.name}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-track" role="img" aria-label={`${Math.round(b.pct * 100)}% recorded`}><span className={`block h-full rounded-full ${b.pct < 0.8 ? "bg-amber" : "bg-brand-hover"}`} style={{ width: `${b.pct * 100}%` }} /></span>
                <span className="text-right font-mono text-xs text-muted">{Math.round(b.pct * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-[18px] pt-1"><h2 className="text-base font-semibold">Activity</h2><Link to="/app/ledger" className="text-[13px] font-semibold">Full ledger</Link></div>
          <div className="px-[18px] pb-4 pt-2">
            {db.events.slice(-7).reverse().map((e) => {
              const s = db.students[e.sid];
              return (
                <div key={e.seq} className="grid grid-cols-[54px_1fr] gap-3 border-t border-line py-2.5 text-[13px] text-ink-2 first:border-t-0">
                  <span className="font-mono text-xs text-muted-2">{shortDate(e.ts)}</span>
                  <span>{e.detail.split(" · ")[0]}{s && <span className="text-muted-2"> · {s.name}</span>}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center justify-between px-[18px] pt-4"><h2 className="text-base font-semibold">Road to DPDP Ready</h2><span className="eyebrow">{st.ready} / {st.checks.length}</span></div>
          <div className="px-[18px] pb-[18px] pt-4">
            {st.checks.map((c) => (
              <div key={c.title} className="grid grid-cols-[22px_1fr_auto] items-start gap-3 border-t border-line py-3 text-[13.5px] first:border-t-0 first:pt-0">
                <span className={`mt-px grid h-5 w-5 place-items-center rounded-full border-[1.5px] ${c.ok ? "border-green bg-green" : "border-line-2"}`}>{c.ok && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span>
                <span><span className="font-medium">{c.title}</span><br /><span className="font-mono text-[11.5px] text-muted-2">{c.detail}</span></span>
                {c.action === "breach" && !c.ok && <button className="btn btn-sm" onClick={async () => { await actions.fileBreachPlan(); toast("Breach plan filed"); }}>Mark filed</button>}
              </div>
            ))}
            <div className="mt-1.5 flex items-center gap-4 border-t border-line pt-4">
              <Seal earned={st.ready === st.checks.length} />
              <p className="text-[12.5px] text-muted-2">{st.ready === st.checks.length ? "Earned. Use the DPDP Ready School badge on your website, admission brochures and notice board." : `Finish all ${st.checks.length} steps to earn the DPDP Ready School badge. It is Sahmati's own standard, not a government certificate.`}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
