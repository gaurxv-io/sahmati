import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { QUESTIONS } from "@/pages/Audit";

// "Your school's DPDP report card": five self-audit questions graded the way a school grades
// a student, with a class teacher's remark and a stamp. The result rides along with the
// audit request below.

const SUBJECTS = [
  { name: "Privacy notice", ids: ["a"] },
  { name: "Parent consent", ids: ["c", "d"] },
  { name: "Vendors", ids: ["g"] },
  { name: "Breach plan", ids: ["k"] },
] as const;
const IDS: string[] = SUBJECTS.flatMap((s) => [...s.ids]);
const QS = IDS.map((id) => QUESTIONS.find((q) => q.id === id)!);
const POINTS = [2, 1, 0];

const grade = (pct: number) => (pct >= 1 ? "A" : pct >= 0.75 ? "B" : pct >= 0.5 ? "C" : "D");
const REMARK: Record<string, string> = {
  "Privacy notice": "Parents are not told clearly what data the school keeps.",
  "Parent consent": "Consent is not recorded in a way the Board would accept.",
  Vendors: "Vendors hold student data without signed agreements.",
  "Breach plan": "No plan for reporting a breach within 72 hours.",
};

export type ReportResult = { score: number; gaps: string[] };

export function ReportCard({ onResult }: { onResult: (r: ReportResult) => void }) {
  const [ans, setAns] = useState<Record<string, number>>({});
  const done = QS.every((q) => ans[q.id] !== undefined);

  const subjects = SUBJECTS.map((s) => {
    const answered = s.ids.filter((id) => ans[id] !== undefined);
    const pct = answered.length === s.ids.length ? s.ids.reduce((n, id) => n + POINTS[ans[id]!]!, 0) / (s.ids.length * 2) : null;
    return { name: s.name, pct, grade: pct === null ? null : grade(pct) };
  });
  const score = Math.round((QS.reduce((n, q) => n + (ans[q.id] === undefined ? 0 : POINTS[ans[q.id]!]!), 0) / (QS.length * 2)) * 100);
  const weakest = [...subjects].filter((s) => s.pct !== null && s.pct < 1).sort((a, b) => a.pct! - b.pct!);
  const result = score >= 80 ? "Ready" : score >= 50 ? "Needs work" : "Not ready";
  const remark = !done ? "" : weakest.length
    ? `${REMARK[weakest[0]!.name]} ${weakest.length > 1 ? `Also weak in ${weakest.slice(1).map((s) => s.name.toLowerCase()).join(" and ")}.` : ""} Fix before 13 May 2027.`
    : "Excellent work. Keep records up to date for every new admission.";

  useEffect(() => {
    if (done) onResult({ score, gaps: QS.filter((q) => ans[q.id]! > 0).map((q) => q.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ans]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
      <ol className="flex flex-col gap-3">
        {QS.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-line bg-white p-5">
            <span className="font-mono text-[11px] text-muted-2">{SUBJECTS.find((s) => (s.ids as readonly string[]).includes(q.id))!.name.toUpperCase()} · Q{i + 1}</span>
            <p className="mt-1.5 text-[15.5px] font-semibold leading-snug text-ink">{q.q}</p>
            <div role="radiogroup" aria-label={q.q} className="mt-3.5 flex flex-wrap gap-2">
              {q.a.map((label, ai) => {
                const on = ans[q.id] === ai;
                return (
                  <button key={label} type="button" role="radio" aria-checked={on} onClick={() => setAns((p) => ({ ...p, [q.id]: ai }))}
                    className={`rc-choice rounded-lg border px-3 py-2 text-left text-[13.5px] ${on ? "border-green bg-green-soft font-semibold text-green" : "border-line-2 bg-white text-ink-2 hover:border-muted-3"}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="report-card relative overflow-hidden rounded-md lg:sticky lg:top-24" aria-live="polite">
        <div className="border-b-2 border-double border-ink/70 px-6 pb-3 pt-5 text-center">
          <span className="block font-mono text-[11px] tracking-[0.12em] text-muted-2">PROGRESS REPORT · SESSION 2026–27</span>
          <b className="mt-1 block text-[22px] font-semibold tracking-[-0.02em]">DPDP Report Card</b>
          <span className="mt-1 block text-[13px] text-muted">Name of school: <span className="font-pen text-[17px] text-ink">Your school</span></span>
        </div>

        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-ink/30 text-left font-mono text-[11px] tracking-[0.06em] text-muted-2">
              <th className="px-6 py-2 font-normal">SUBJECT</th>
              <th className="w-24 px-6 py-2 text-center font-normal">GRADE</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.name} className="border-b border-ink/15">
                <td className="px-6 py-3 text-ink-2">{s.name}</td>
                <td className="px-6 py-1.5 text-center">
                  {s.grade ? <span key={s.grade} className={`grade font-pen text-[28px] font-bold leading-none ${s.grade === "A" ? "text-green" : "text-pen"}`}>{s.grade}</span> : <span className="text-muted-3">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 pb-5 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] tracking-[0.06em] text-muted-2">RESULT</span>
            {done ? <span className={`grade font-pen text-[22px] font-bold ${score >= 80 ? "text-green" : "text-pen"}`}>{result} · {score}%</span> : <span className="text-[13px] text-muted-3">Answer all five questions</span>}
          </div>
          <div className="mt-3 min-h-[76px] rounded border border-dashed border-ink/25 px-3 py-2">
            <span className="font-mono text-[11px] tracking-[0.06em] text-muted-2">CLASS TEACHER'S REMARKS</span>
            {done && <p key={remark} className="remark mt-1 font-pen text-[16px] leading-snug text-pen">{remark}</p>}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-[12px] text-muted-2">Signature<span className="mt-1 block border-t border-ink/40 pt-1 font-pen text-[16px] text-ink">Sahmati</span></span>
            {done && (
              <svg key={score} className="stamp h-[84px] w-[84px]" viewBox="0 0 100 100" aria-label="Sahmati audit stamp">
                <defs><path id="rc-ring" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></defs>
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" />
                <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <text fontSize="10.5" fontWeight="700" letterSpacing="2.4" fill="currentColor"><textPath href="#rc-ring">SAHMATI · DPDP AUDIT · 2027 ·</textPath></text>
                <text x="50" y="55" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor">{score >= 80 ? "READY" : "CHECK"}</text>
              </svg>
            )}
          </div>
          {done && (
            <div className="mt-5 flex flex-col gap-2">
              <a href="#audit" className="btn btn-primary btn-lg w-full">Book a free audit to fix this</a>
              <Link to="/audit" className="inline-flex items-center justify-center gap-1 text-[13.5px] font-semibold">Take the full 12-question audit <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
