import { Crest, Pill } from "@/components/brand";
import { clsLabel, fmtDate, fmtTime, maskPhone } from "@/lib/derive";
import { LANGS } from "@/lib/i18n";
import type { LedgerEvent, ParentRequest, Student, Vendor } from "@/lib/types";

const REQ = { access: "See my child's data", correct: "Correct my child's data", delete: "Delete my child's data" } as const;
const DPA = { signed: ["DPA signed", "bg-green-soft text-green"], sent: ["DPA sent", "bg-amber-soft text-amber-ink"], missing: ["No DPA yet", "bg-danger-soft text-danger"] } as const;

export type PackProps = {
  school: { name: string; city: string; slug: string; noticeVersion: string; dpo: string };
  student: Student;
  events: LedgerEvent[];
  requests: ParentRequest[];
  vendors: Vendor[];
  preparedAt: string;
};

/** The parent data pack: everything the school holds about one student's consent, in one printable page. */
export default function PackView({ school, student: s, events, requests, vendors, preparedAt }: PackProps) {
  const on = s.status !== "pending";
  const yn = (v: boolean) => <span className={`font-mono text-xs ${v ? "text-green" : "text-muted-2"}`}>{v ? "YES" : "NO"}</span>;
  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <Crest name={school.name} />
        <div className="min-w-0">
          <div className="font-semibold">{school.name}</div>
          <div className="font-mono text-[11px] text-muted-2">{school.city ? `${school.city.toUpperCase()} · ` : ""}{school.slug}.sahmati.in</div>
        </div>
        <div className="ml-auto text-right">
          <div className="eyebrow">Parent data pack</div>
          <div className="font-mono text-[11px] text-muted-2">PREPARED {fmtDate(preparedAt).toUpperCase()}</div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-[18px]">
          <span className="eyebrow">01 · Student</span>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[13px]">
            <dt className="text-muted-2">Name</dt><dd className="font-semibold">{s.name}</dd>
            <dt className="text-muted-2">Class</dt><dd>{clsLabel(s)}</dd>
            <dt className="text-muted-2">Parent</dt><dd>{s.parent}</dd>
            <dt className="text-muted-2">Mobile</dt><dd className="font-mono text-xs">{maskPhone(s.phone)}</dd>
            <dt className="text-muted-2">Language</dt><dd>{LANGS[s.lang]?.name ?? "English"}</dd>
          </dl>
        </div>
        <div className="panel p-[18px]">
          <div className="flex items-center justify-between"><span className="eyebrow">02 · Current consents</span><Pill kind={s.status} /></div>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[13px]">
            <dt>Education and school records</dt><dd>{yn(on)}</dd>
            <dt>Photos on website and social media</dt><dd>{yn(on && s.choices.web)}</dd>
            <dt>Event photos in the newsletter</dt><dd>{yn(on && s.choices.newsletter)}</dd>
            <dt className="text-muted-2">Consent recorded</dt><dd className="font-mono text-xs">{s.consentAt ? fmtDate(s.consentAt) : "Not yet"}</dd>
            <dt className="text-muted-2">Notice version</dt><dd className="font-mono text-xs">{s.noticeAt ?? (s.consentAt ? school.noticeVersion : "-")}</dd>
            <dt className="text-muted-2">Receipt</dt><dd className="font-mono text-xs">{s.receipt ? `#${s.receipt}` : "-"}</dd>
          </dl>
        </div>
      </section>

      <section className="panel">
        <div className="flex items-center justify-between px-[18px] pt-4"><span className="eyebrow">03 · Consent ledger records</span><span className="font-mono text-[11px] text-muted-2">{events.length} RECORDS</span></div>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full border-collapse text-[13px]">
            <thead><tr><th className="th">#</th><th className="th">Time (IST)</th><th className="th">Record</th><th className="th">SHA-256 hash</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.seq} className="[&:last-child>td]:border-b-0">
                  <td className="td font-mono text-muted-2 tabular-nums">{String(e.seq).padStart(4, "0")}</td>
                  <td className="td whitespace-nowrap tabular-nums">{fmtTime(e.ts)}</td>
                  <td className="td">{e.detail}</td>
                  <td className="td"><span className="block min-w-[200px] break-all font-mono text-[10.5px] text-muted-2">{e.hash}</span></td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan={4} className="td py-6 text-center text-muted-2">No records for this student yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-[18px]">
          <span className="eyebrow">04 · Requests from the parent</span>
          <div className="mt-2">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 text-[13px] first:border-t-0">
                <span><b className="font-semibold">{REQ[r.type]}</b><br /><span className="font-mono text-[11px] text-muted-2">RECEIVED {fmtDate(r.createdAt).toUpperCase()}{r.doneAt ? ` · CLOSED ${fmtDate(r.doneAt).toUpperCase()}` : ""}</span></span>
                <Pill kind={r.status === "done" ? "done" : "open"} />
              </div>
            ))}
            {!requests.length && <p className="pt-1 text-[13px] text-muted-2">No requests.</p>}
          </div>
        </div>
        <div className="panel p-[18px]">
          <span className="eyebrow">05 · Who else receives this data</span>
          <div className="mt-2">
            {vendors.map((v) => (
              <div key={v.id} className="border-t border-line py-2.5 text-[13px] first:border-t-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><b className="font-semibold">{v.name}</b><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DPA[v.dpa][1]}`}>{DPA[v.dpa][0]}</span></div>
                <div className="text-muted-2">{v.role}</div>
                <div className="mt-1 flex flex-wrap gap-1">{v.data.map((d) => <span key={d} className="tag">{d}</span>)}</div>
              </div>
            ))}
            {!vendors.length && <p className="pt-1 text-[13px] text-muted-2">The school shares this data with no outside vendors.</p>}
          </div>
        </div>
      </section>

      <footer className="border-t border-line pt-4 text-[12.5px] text-muted-2">
        Prepared under India's Digital Personal Data Protection Act, 2023. Questions or corrections: {school.dpo || "the school office"}. Each ledger hash can be checked against the school's tamper-evident record at sahmati.in/verify.
      </footer>
    </article>
  );
}
