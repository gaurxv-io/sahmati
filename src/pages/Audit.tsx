import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Printer } from "lucide-react";
import { Logo, Pill } from "@/components/brand";
import { actions } from "@/lib/store";
import { daysLeft } from "@/lib/derive";

type Q = { id: string; area: string; q: string; a: [string, string, string]; fix: string; feature: string; how: string };

const AREAS = ["Notices", "Consent", "Data handling", "Rights & breaches"] as const;

export const QUESTIONS: Q[] = [
  { id: "a", area: "Notices", q: "Do parents get a written privacy notice explaining what student data you collect and why?", a: ["Yes, every parent gets one at admission", "Partly, it's in the prospectus or website only", "No written notice"], fix: "Give every parent a plain written notice of what student data you collect and why.", feature: "Privacy notices", how: "Sahmati shows a versioned notice before every consent" },
  { id: "b", area: "Notices", q: "Is that notice available in the languages your parents read?", a: ["Yes, in every language our parents use", "Only in English", "No notice yet"], fix: "Offer the notice in the languages your parents actually read.", feature: "English and Hindi notices", how: "Sahmati shows parents the notice in English and Hindi" },
  { id: "c", area: "Consent", q: "Do you collect parent consent before posting student photos on your website or social media?", a: ["Yes, separate written consent for photos", "Covered by a line in the admission form", "No, we post without asking"], fix: "Take separate, specific consent before using a child's photo online.", feature: "Optional consents", how: "Sahmati tracks photo consent separately from school records" },
  { id: "d", area: "Consent", q: "Can you show who consented, when, and to which notice version?", a: ["Yes, for every student", "Paper forms, hard to search", "No record"], fix: "Keep a searchable record of who consented, when, and to which notice.", feature: "Consent records", how: "Sahmati keeps a hash-chained consent ledger" },
  { id: "e", area: "Consent", q: "Can a parent withdraw consent as easily as they gave it?", a: ["Yes, in one step", "Only by writing to the school", "No way to withdraw"], fix: "Let parents withdraw consent as easily as they gave it.", feature: "One-tap withdrawal", how: "Parents withdraw from the same WhatsApp link" },
  { id: "f", area: "Data handling", q: "Do you know every place student data lives (ERP, WhatsApp groups, bus app, CCTV, photographers, spreadsheets)?", a: ["Yes, we have a written list", "Roughly, nothing written", "No"], fix: "List every system and person that holds student data.", feature: "Free audit", how: "Sahmati's in-person audit maps every data flow with you" },
  { id: "g", area: "Data handling", q: "Do your vendors (ERP, transport app, photographer) have signed data processing agreements?", a: ["Yes, all of them", "Some of them", "None"], fix: "Sign a data processing agreement with every vendor that touches student data.", feature: "Vendor agreements", how: "Sahmati provides a ready DPA template for your vendors" },
  { id: "h", area: "Data handling", q: "Do you delete data of students who left, on a schedule?", a: ["Yes, on a fixed schedule", "Sometimes, no fixed rule", "We keep everything"], fix: "Delete data of students who left on a fixed schedule.", feature: "Compliance report", how: "Sahmati's report shows what is still held and why" },
  { id: "i", area: "Data handling", q: "Is access to student records limited to staff who need it?", a: ["Yes, by role", "Mostly, some shared logins", "Everyone can see everything"], fix: "Limit access to student records to staff who need it.", feature: "Role-based console", how: "Sahmati gives each staff member only the access they need" },
  { id: "j", area: "Rights & breaches", q: "Can parents ask to see, correct or delete their child's data, with a set reply time?", a: ["Yes, with a set reply time", "Informally, no deadline", "No process"], fix: "Give parents a way to see, correct or delete data, with a reply deadline.", feature: "Parent requests", how: "Sahmati logs every request with a due date" },
  { id: "k", area: "Rights & breaches", q: "Do you have a written plan for reporting a data breach to the Data Protection Board and parents within 72 hours?", a: ["Yes, written and shared", "We'd figure it out", "No plan"], fix: "Write a breach plan to inform the Board and parents within 72 hours.", feature: "Breach response plan", how: "Sahmati tracks your filed breach plan on the readiness checklist" },
  { id: "l", area: "Rights & breaches", q: "Is one named person responsible for data protection?", a: ["Yes, named and known to parents", "Informally the principal", "No one"], fix: "Name one person responsible for data protection and tell parents.", feature: "Data protection contact", how: "Sahmati shows your named contact on every notice and report" },
];

const POINTS = [2, 1, 0];

export default function Audit() {
  const [step, setStep] = useState(-1); // -1 intro, 0..11 questions, 12 results
  const [ans, setAns] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: "", school: "", city: "", phone: "", size: "" });
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const total = QUESTIONS.length;
  const score = Math.round((QUESTIONS.reduce((n, q) => n + POINTS[ans[q.id] ?? 2], 0) / (total * 2)) * 100);
  const gaps = QUESTIONS.filter((q) => (ans[q.id] ?? 0) > 0);
  const verdict = score >= 80 ? { kind: "met" as const, label: "Nearly ready" } : score >= 50 ? { kind: "open" as const, label: "Partly ready" } : { kind: "late" as const, label: "High risk" };
  const areas = AREAS.map((a) => { const qs = QUESTIONS.filter((q) => q.area === a); return { name: a, pct: qs.reduce((n, q) => n + POINTS[ans[q.id] ?? 2], 0) / (qs.length * 2) }; });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f = { name: form.name.trim().slice(0, 100), school: form.school.trim().slice(0, 150), city: form.city.trim().slice(0, 80), phone: form.phone.replace(/\D/g, "").slice(-10), size: form.size.trim().slice(0, 10) };
    if (!f.name || !f.school || !f.city) { setErr("Please fill in your name, school and city."); return; }
    if (!/^\d{10}$/.test(f.phone)) { setErr("Enter a 10-digit WhatsApp number."); return; }
    setErr("");
    await actions.addLead({ ...f, role: "Self-audit", score, gaps: gaps.map((g) => g.id) });
    setSent(true);
  };

  const q = QUESTIONS[step];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white print:hidden"><div className="mx-auto flex max-w-[640px] items-center px-4 py-3.5"><Logo /><span className="ml-auto font-mono text-[11px] text-muted-2">SELF-AUDIT</span></div></header>
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 py-10 print:py-0">
        {step === -1 && (
          <div className="grid gap-4">
            <span className="eyebrow">Free DPDP self-audit</span>
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Where does your school stand? 12 questions, 5 minutes.</h1>
            <p className="text-muted">Answer honestly about how your school handles student data today. You get an instant readiness score and a written list of what to fix before the deadline.</p>
            <p className="font-mono text-[11px] text-muted-2">FULL COMPLIANCE DUE 13 MAY 2027 · {daysLeft()} DAYS LEFT</p>
            <button className="btn btn-primary btn-lg w-fit" onClick={() => setStep(0)}>Start <ArrowRight className="h-4 w-4" /></button>
          </div>
        )}

        {q && (
          <div className="grid gap-5">
            <div className="grid gap-2">
              <span className="font-mono text-[11px] text-muted-2">Question {step + 1} of {total}</span>
              <span className="h-1 overflow-hidden rounded-full bg-[#E7EAE8]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step + 1}><span className="block h-full rounded-full bg-[#00C46A] transition-[width]" style={{ width: `${((step + 1) / total) * 100}%` }} /></span>
            </div>
            <span className="eyebrow">{String(AREAS.indexOf(q.area as (typeof AREAS)[number]) + 1).padStart(2, "0")} · {q.area}</span>
            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">{q.q}</h1>
            <div role="radiogroup" aria-label={q.q} className="grid gap-2.5">
              {q.a.map((label, i) => {
                const sel = ans[q.id] === i;
                return (
                  <button key={i} role="radio" aria-checked={sel} onClick={() => setAns({ ...ans, [q.id]: i })} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-[14.5px] ${sel ? "border-green-line bg-green-soft" : "border-line bg-white hover:border-line-2"}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] ${sel ? "border-green bg-green" : "border-line-2"}`}>{sel && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span>
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between gap-2">
              <button className="btn" onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" />Back</button>
              <button className="btn btn-primary" disabled={ans[q.id] == null} onClick={() => setStep(step + 1)}>{step === total - 1 ? "See my score" : "Next"}<ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {step === total && (
          <>
            <div className="grid gap-3">
              <span className="eyebrow">Your DPDP readiness</span>
              <div className="flex flex-wrap items-end gap-4">
                <span className="text-[64px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{score}%</span>
                <span className="mb-2"><Pill kind={verdict.kind} label={verdict.label} /></span>
              </div>
              <p className="font-mono text-[11px] text-muted-2">Full compliance due 13 May 2027 · {daysLeft()} days left</p>
            </div>

            <div className="panel">
              <div className="flex items-center justify-between px-[18px] pt-4"><h2 className="text-base font-semibold">By area</h2><span className="eyebrow">Score</span></div>
              <div className="flex flex-col gap-3 px-[18px] py-4">
                {areas.map((b) => (
                  <div key={b.name} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-[13px]">
                    <span>{b.name}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-track" role="img" aria-label={`${Math.round(b.pct * 100)}%`}><span className={`block h-full rounded-full ${b.pct < 0.8 ? "bg-amber" : "bg-brand-hover"}`} style={{ width: `${b.pct * 100}%` }} /></span>
                    <span className="text-right font-mono text-xs text-muted">{Math.round(b.pct * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="flex items-center justify-between px-[18px] pt-4"><h2 className="text-base font-semibold">Your gaps</h2><span className="eyebrow">{gaps.length} to fix</span></div>
              <div className="px-[18px] pb-4 pt-2">
                {gaps.map((g) => (
                  <div key={g.id} className="grid gap-1 border-t border-line py-3 text-[13.5px] first:border-t-0">
                    <div className="flex flex-wrap items-center gap-2"><Pill kind={ans[g.id] === 2 ? "late" : "open"} label={ans[g.id] === 2 ? "Gap" : "Partial"} /><span className="font-medium">{g.fix}</span></div>
                    <span className="font-mono text-[11.5px] text-muted-2">{g.feature.toUpperCase()} → {g.how}</span>
                  </div>
                ))}
                {!gaps.length && <p className="py-3 text-[13px] text-muted-2">No gaps found. An in-person audit confirms it with evidence.</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <button className="btn" onClick={() => window.print()}><Printer className="h-4 w-4" />Print or save PDF</button>
              <button className="btn btn-ghost" onClick={() => { setAns({}); setSent(false); setStep(0); }}>Retake</button>
            </div>

            <div className="print:hidden">
              {sent ? (
                <div className="flex flex-col items-start gap-3 rounded-xl border border-green-line bg-green-soft p-6">
                  <b className="text-xl font-semibold">Thanks, {form.name.split(" ")[0]}.</b>
                  <p className="text-muted">We'll message you on WhatsApp within one working day with this report and a time for {form.school}'s free audit.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-white p-6 sm:grid-cols-2">
                  <h2 className="text-base font-semibold sm:col-span-2">Get this report and book the free 45-minute audit</h2>
                  {([["name", "Your name", "text"], ["school", "School name", "text"], ["city", "City", "text"], ["phone", "WhatsApp number", "tel"], ["size", "Number of students", "number"]] as const).map(([k, l, t]) => (
                    <label key={k} className="flex flex-col gap-1.5 text-[13px] font-medium">{l}
                      <input id={`audit-${k}`} type={t} inputMode={t === "tel" || t === "number" ? "numeric" : undefined} className="field min-h-10 text-sm" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                    </label>
                  ))}
                  {err && <p className="text-[13px] text-danger sm:col-span-2">{err}</p>}
                  <button className="btn btn-primary w-fit sm:col-span-2" type="submit">Send me the report</button>
                </form>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
