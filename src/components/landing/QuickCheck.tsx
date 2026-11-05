import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { QUESTIONS } from "@/pages/Audit";
import { useCountUp } from "@/lib/motion";

// Four of the self-audit's twelve questions, answered right on the landing page. The score and
// gaps feed the audit request form below, so the visit starts from what the school told us.

const PICK = ["c", "d", "g", "k"];
const POINTS = [2, 1, 0];
const QS = QUESTIONS.filter((q) => PICK.includes(q.id));

export type QuickResult = { score: number; gaps: string[] };

export function QuickCheck({ onResult }: { onResult: (r: QuickResult) => void }) {
  const [ans, setAns] = useState<Record<string, number>>({});
  const answered = QS.filter((q) => ans[q.id] !== undefined).length;
  const done = answered === QS.length;
  const points = QS.reduce((sum, q) => sum + (ans[q.id] === undefined ? 0 : POINTS[ans[q.id]!]!), 0);
  const score = answered ? Math.round((points / (answered * 2)) * 100) : 0;
  const shown = useCountUp(score, answered > 0, 600);
  const gaps = QS.filter((q) => (ans[q.id] ?? 0) > 0);
  const verdict = score >= 80 ? "Nearly ready" : score >= 50 ? "Partly ready" : "At risk";
  const tone = score >= 80 ? "text-green" : score >= 50 ? "text-amber-ink" : "text-danger";

  const choose = (id: string, i: number) => {
    const next = { ...ans, [id]: i };
    setAns(next);
    if (QS.every((q) => next[q.id] !== undefined)) {
      const pts = QS.reduce((sum, q) => sum + POINTS[next[q.id]!]!, 0);
      onResult({ score: Math.round((pts / (QS.length * 2)) * 100), gaps: QS.filter((q) => next[q.id]! > 0).map((q) => q.id) });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <ol className="flex flex-col gap-3">
        {QS.map((q, qi) => (
          <li key={q.id} className="rounded-xl border border-line bg-white p-5">
            <p className="flex gap-3 text-[15.5px] font-semibold leading-snug text-ink">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-subtle text-[12px] font-semibold text-muted">{qi + 1}</span>
              {q.q}
            </p>
            <div role="radiogroup" aria-label={q.q} className="mt-3.5 flex flex-wrap gap-2 sm:pl-9">
              {q.a.map((label, i) => {
                const on = ans[q.id] === i;
                return (
                  <button key={label} type="button" role="radio" aria-checked={on} onClick={() => choose(q.id, i)}
                    className={`choice rounded-lg border px-3 py-2 text-left text-[13.5px] ${on ? "border-green bg-green-soft font-semibold text-green" : "border-line-2 bg-white text-ink-2 hover:border-muted-3"}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <aside className="rounded-xl border border-line bg-white p-6 lg:sticky lg:top-24" aria-live="polite">
        <span className="text-[13px] text-muted-2">{done ? "Your school today" : `${answered} of ${QS.length} answered`}</span>
        <div className="mt-1 flex items-baseline gap-2">
          <b className={`text-[52px] font-semibold leading-none tracking-[-0.04em] tabular-nums ${answered ? tone : "text-line-2"}`}>{answered ? `${shown}%` : "–"}</b>
          {answered > 0 && <span className={`text-[15px] font-semibold ${tone}`}>{verdict}</span>}
        </div>
        <span className="mt-4 block h-2 overflow-hidden rounded-full bg-track">
          <span className={`meter block h-full rounded-full ${score >= 80 ? "bg-brand-hover" : score >= 50 ? "bg-amber" : "bg-danger"}`} style={{ width: `${answered ? score : 0}%` }} />
        </span>

        {!done && <p className="mt-4 text-[14px] text-muted">Answer honestly. Nothing is sent until you ask for the audit.</p>}

        {done && (
          <div className="feed-in mt-5 flex flex-col gap-4">
            {gaps.length ? (
              <ul className="flex flex-col gap-3">
                {gaps.map((g) => (
                  <li key={g.id} className="text-[13.5px] leading-snug">
                    <b className="block font-semibold text-ink">{g.fix}</b>
                    <span className="text-muted-2">{g.how}.</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-start gap-2 text-[14px] text-ink-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />Strong start. The full check covers notices, data handling and parent rights too.</p>
            )}
            <a href="#audit" className="btn btn-primary btn-lg w-full">Book a free audit</a>
            <Link to="/audit" className="inline-flex items-center justify-center gap-1 text-[13.5px] font-semibold">Take the full 12-question check <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        )}
      </aside>
    </div>
  );
}
