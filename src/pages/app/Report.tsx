import { Download, Printer } from "lucide-react";
import { Pill, Seal } from "@/components/brand";
import { useDB } from "@/lib/store";
import { SLA_DAYS, daysLeft, fmtTime, stats } from "@/lib/derive";
import { PageHead } from "./Layout";
import { downloadText, ledgerCsv } from "./Ledger";

export default function Report() {
  const db = useDB()!;
  const st = stats(db);
  const last = db.events[db.events.length - 1];
  return (
    <>
      <PageHead n="05" label="Compliance report" title="Report for the Board, trustees or any parent">
        <button className="btn" onClick={() => downloadText("sahmati-consent-ledger.csv", ledgerCsv(db))}><Download className="h-4 w-4" />Ledger CSV</button>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print or save PDF</button>
      </PageHead>
      <article id="report" className="grid max-w-[840px] gap-7 rounded-xl border border-line-2 bg-white p-6 shadow-card sm:p-12 print:border-0 print:shadow-none">
        <header className="grid gap-2.5">
          <span className="eyebrow">DPDP Act 2023 · Readiness report</span>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{db.school.name}</h1>
          <p className="font-mono text-xs uppercase text-muted-2">{db.school.city} · {db.school.slug}.sahmati.in · generated {fmtTime(new Date().toISOString())} IST</p>
        </header>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Consent is recorded for <b>{st.given + st.withdrawn} of {st.total} students</b> ({Math.round(st.cov * 100)}%). {st.pending} parents have not yet responded and {st.withdrawn} {st.withdrawn === 1 ? "has" : "have"} withdrawn optional consents. The school meets {st.ready} of {st.checks.length} readiness steps with {daysLeft()} days left before the 13 May 2027 deadline.
        </p>
        <section>
          <h2 className="mb-2.5 text-[15px] font-semibold">Coverage by class group</h2>
          <table className="w-full text-[13px]"><thead><tr>{["Group", "Students", "Recorded", "Coverage"].map((h) => <th key={h} className="th bg-transparent pl-0">{h}</th>)}</tr></thead>
            <tbody>{st.bands.map((b) => <tr key={b.name}><td className="td pl-0">{b.name}</td><td className="td pl-0 tabular-nums">{b.total}</td><td className="td pl-0 tabular-nums">{b.done}</td><td className="td pl-0 tabular-nums">{Math.round(b.pct * 100)}%</td></tr>)}</tbody></table>
        </section>
        <section>
          <h2 className="mb-2.5 text-[15px] font-semibold">Readiness checklist</h2>
          <table className="w-full text-[13px]"><tbody>{st.checks.map((c) => <tr key={c.title}><td className="td w-24 pl-0"><Pill kind={c.ok ? "met" : "unmet"} /></td><td className="td pl-0">{c.title}</td><td className="td pl-0 font-mono text-[11.5px] text-muted-2">{c.detail}</td></tr>)}</tbody></table>
        </section>
        <section className="grid gap-1.5">
          <h2 className="text-[15px] font-semibold">Parent rights requests</h2>
          <p>{st.reqs} received · {st.reqs - st.open} resolved · {st.open} open · {st.late} overdue against a {SLA_DAYS}-day target.</p>
        </section>
        <section className="grid gap-1.5">
          <h2 className="text-[15px] font-semibold">Consent records</h2>
          <p>{db.events.length} records in an append-only, hash-chained ledger. Each consent stores the parent, time, notice version ({db.school.noticeVersion}) and OTP verification. Data protection contact: {db.school.dpo}.</p>
          <p className="break-all font-mono text-[11.5px] text-muted-2">LATEST RECORD #{last?.seq} · {last?.hash}</p>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-line pt-5">
          <p className="max-w-[52ch] text-[12.5px] text-muted-2">Prepared with Sahmati, which processes data on the school's behalf under a data processing agreement. The school remains the data fiduciary under the Act. This report is general guidance, not legal advice.</p>
          <Seal earned={st.ready === st.checks.length} />
        </footer>
      </article>
    </>
  );
}
