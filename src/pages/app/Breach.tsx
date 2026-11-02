import { useEffect, useState, type FormEvent } from "react";
import { MSG, fill } from "@/lib/i18n";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, MessageCircle, X } from "lucide-react";
import { Pill } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { BREACH_CAUSES, BREACH_DATA, BREACH_STEPS, breachDeadline, breachOverdue, fmtDate, fmtTime } from "@/lib/derive";
import { copyText } from "@/lib/clipboard";
import type { Breach as BreachT, DB } from "@/lib/types";
import { PageHead } from "./Layout";

const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

function useNow() {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(i); }, []);
  return t;
}

export function boardDraft(db: DB, b: BreachT) {
  return `To: Data Protection Board of India
Subject: Intimation of personal data breach – ${db.school.name}, ${db.school.city}

${db.school.name} (data fiduciary) is informing the Board of a personal data breach.

What happened: ${b.what}
How it happened: ${b.cause}
Discovered: ${fmtTime(b.discoveredAt)} IST, ${fmtDate(b.discoveredAt)}
Data affected: ${b.data.join(", ") || "Being assessed"}
Students affected: about ${b.count}

Steps taken so far: access has been stopped and passwords changed where relevant. Affected parents are being informed. A detailed report with the cause, impact and measures taken will follow within 72 hours of discovery.

Contact: ${db.school.dpo}, ${db.school.name}`;
}

export function parentDraft(db: DB, b: BreachT) {
  const en = `Dear parent, ${db.school.name} found that some of your child's information (${b.data.join(", ").toLowerCase() || "details"}) was exposed: ${b.what.toLowerCase()}. We have stopped further access and informed the Data Protection Board. Please be careful of unexpected calls or messages that mention your child. For questions, contact ${db.school.dpo}.`;
  const hi = `प्रिय अभिभावक, ${db.school.name} को पता चला है कि आपके बच्चे की कुछ जानकारी गलती से उजागर हुई है। हमने आगे की पहुँच रोक दी है और डेटा संरक्षण बोर्ड को सूचित कर दिया है। कृपया आपके बच्चे के नाम से आने वाले अनजान कॉल या संदेशों से सावधान रहें। सवालों के लिए ${db.school.dpo} से संपर्क करें।`;
  const more = (db.school.languages ?? []).filter((l) => l !== "en" && l !== "hi").map((l) => fill(MSG[l].breach, { school: db.school.name, dpo: db.school.dpo }));
  return [en, hi, ...more].join("\n\n");
}

function Countdown({ b }: { b: BreachT }) {
  const t = useNow();
  const left = breachDeadline(b) - t;
  const reported = !!b.steps[3];
  const over = left <= 0;
  const h = Math.floor(Math.max(0, left) / 3600000);
  const m = Math.floor((Math.max(0, left) % 3600000) / 60000);
  const tone = reported ? "text-green" : over || left < 24 * 3600000 ? "text-danger" : "text-amber-ink";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">Detailed report to the Board due {fmtTime(new Date(breachDeadline(b)).toISOString())} IST</span>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${tone}`}>{reported ? "Reported" : over ? "00:00" : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`}</span>
        {!reported && !over && <span className="text-[15px] text-muted">left to report</span>}
        {!reported && over && <Pill kind="late" label="Overdue" />}
      </div>
    </div>
  );
}

export default function Breach() {
  const db = useDB()!;
  const search = useSearch({ from: "/app/breach" });
  const navigate = useNavigate({ from: "/app/breach" });
  const showForm = !!search.new;
  const active = db.breaches.slice().reverse().find((b) => b.status === "open");
  const past = db.breaches.slice().reverse().filter((b) => b !== active);

  const [form, setForm] = useState({ what: "", discoveredAt: localNow(), data: [] as string[], count: "", cause: BREACH_CAUSES[0] as string });
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const what = form.what.trim().slice(0, 500);
    const count = Math.max(0, Math.min(100000, parseInt(form.count, 10) || 0));
    const at = Date.parse(form.discoveredAt);
    if (!what) { setErr("Describe what happened."); return; }
    if (Number.isNaN(at)) { setErr("Enter when it was discovered."); return; }
    setErr("");
    await actions.reportBreach({ what, discoveredAt: new Date(at).toISOString(), data: form.data, count, cause: form.cause });
    navigate({ search: {}, replace: true });
    toast("72-hour response started");
  };

  const toggle = (d: string) => setForm({ ...form, data: form.data.includes(d) ? form.data.filter((x) => x !== d) : [...form.data, d] });

  return (
    <>
      <PageHead n="07" label="Breaches" title="Data breach response" desc="If student data leaks, the Board and affected parents must be told, with a detailed report within 72 hours. Every step is logged in the consent ledger.">
        {!showForm && <button className="btn btn-danger" onClick={() => navigate({ search: { new: 1 } })}><AlertTriangle className="h-4 w-4" />Report a data breach</button>}
      </PageHead>

      {showForm && (
        <form onSubmit={submit} className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-line bg-white p-[18px] shadow-card">
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Report a data breach</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate({ search: {}, replace: true })}><X className="h-3.5 w-3.5" />Cancel</button></div>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">What happened
            <textarea id="br-what" className="field min-h-24 py-2.5 text-sm" placeholder="For example: a staff phone with the class WhatsApp groups was lost" value={form.what} onChange={(e) => setForm({ ...form, what: e.target.value })} />
          </label>
          <div className="grid gap-3.5 sm:grid-cols-3">
            <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-medium">When it was discovered
              <input id="br-at" type="datetime-local" className="field min-h-10 w-full min-w-0 text-sm" value={form.discoveredAt} onChange={(e) => setForm({ ...form, discoveredAt: e.target.value })} />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-medium">Roughly how many students
              <input id="br-count" type="number" min={0} inputMode="numeric" className="field min-h-10 w-full text-sm" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-medium">How it happened
              <select id="br-cause" className="field min-h-10 w-full text-sm" value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })}>{BREACH_CAUSES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[13px] font-medium">Which data was affected</legend>
            <div className="flex flex-wrap gap-2">
              {BREACH_DATA.map((d) => (
                <label key={d} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ${form.data.includes(d) ? "border-green-line bg-green-soft" : "border-line bg-white"}`}>
                  <input type="checkbox" className="accent-[#047A44]" checked={form.data.includes(d)} onChange={() => toggle(d)} />{d}
                </label>
              ))}
            </div>
          </fieldset>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          <button className="btn btn-primary w-fit" type="submit">Start 72-hour response</button>
        </form>
      )}

      {active && !showForm && (
        <>
          <div className="panel flex min-w-0 flex-col gap-5 p-[18px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><span className="eyebrow">Active incident · {active.id.toUpperCase()}</span><h2 className="mt-1.5 text-[17px] font-semibold">{active.what}</h2><p className="mt-1 font-mono text-[11.5px] uppercase text-muted-2">{active.cause} · about {active.count} students · discovered {fmtTime(active.discoveredAt)} IST</p></div>
              {breachOverdue(active) ? <Pill kind="late" label="Overdue" /> : <Pill kind="open" label="Open" />}
            </div>
            <Countdown b={active} />
            <div>
              {BREACH_STEPS.map(([title, sub], i) => {
                const at = active.steps[i];
                return (
                  <div key={title} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3 text-[13.5px]">
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-[1.5px] ${at ? "border-green bg-green" : "border-line-2"}`}>{at && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span>
                    <span className="min-w-0"><span className="font-medium">{i + 1}. {title}</span><br /><span className="font-mono text-[11.5px] text-muted-2">{at ? `DONE ${fmtTime(at).toUpperCase()}` : sub}</span></span>
                    {!at && <button className="btn btn-sm" onClick={async () => { await actions.breachStep(active.id, i); toast(i === 5 ? "Incident closed" : `${title}: done`); }}>Mark done</button>}
                  </div>
                );
              })}
            </div>
          </div>
          <Drafts db={db} b={active} />
        </>
      )}

      {!active && !showForm && (
        <div className="panel grid min-h-40 place-content-center justify-items-center gap-2 p-6 text-center">
          <h2 className="text-base font-semibold">No open incidents</h2>
          <p className="max-w-md text-[12.5px] text-muted-2">If student data is lost, sent to the wrong person or leaked by a vendor, report it here to start the 72-hour clock and get ready-to-send drafts.</p>
        </div>
      )}

      <div className="panel min-w-0">
        <div className="flex items-center justify-between px-[18px] pt-4"><h2 className="text-base font-semibold">Past incidents</h2><span className="eyebrow">{past.length}</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead><tr><th className="th">Incident</th><th className="th">Discovered</th><th className="th">Students</th><th className="th">Status</th></tr></thead>
            <tbody>
              {past.map((b) => (
                <tr key={b.id} className="[&:last-child>td]:border-b-0">
                  <td className="td"><b className="font-semibold text-ink">{b.what}</b><div className="font-mono text-[11.5px] text-muted-2">{b.id.toUpperCase()} · {b.cause}</div></td>
                  <td className="td whitespace-nowrap">{fmtDate(b.discoveredAt)}</td>
                  <td className="td tabular-nums">{b.count}</td>
                  <td className="td">{b.status === "closed" ? <Pill kind="done" label={`Closed · ${b.steps.filter(Boolean).length}/6 steps`} /> : breachOverdue(b) ? <Pill kind="late" label="Overdue" /> : <Pill kind="open" />}</td>
                </tr>
              ))}
              {!past.length && <tr><td colSpan={4} className="td py-6 text-center text-muted-2">No past incidents.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Drafts({ db, b }: { db: DB; b: BreachT }) {
  const board = boardDraft(db, b);
  const parents = parentDraft(db, b);
  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      <div className="panel flex min-w-0 flex-col gap-3 p-[18px]">
        <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">Intimation to the Data Protection Board</h2><button className="btn btn-sm shrink-0" onClick={() => copyText(board, "Board draft copied")}><Copy className="h-3.5 w-3.5" />Copy</button></div>
        <pre id="board-draft" className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-canvas p-3 font-mono text-[12px] leading-relaxed text-ink-2">{board}</pre>
        <p className="text-[12.5px] text-muted-2">Check the current Board filing process before sending. This draft is general guidance, not legal advice.</p>
      </div>
      <div className="panel flex min-w-0 flex-col gap-3 p-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">Message to affected parents</h2>
          <div className="flex gap-2"><button className="btn btn-sm" onClick={() => copyText(parents, "Parent message copied")}><Copy className="h-3.5 w-3.5" />Copy</button><a className="btn btn-sm" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(parents)}`}><MessageCircle className="h-3.5 w-3.5" />Share on WhatsApp</a></div>
        </div>
        <pre id="parent-draft" className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-canvas p-3 font-sans text-[13px] leading-relaxed text-ink-2">{parents}</pre>
      </div>
    </div>
  );
}
