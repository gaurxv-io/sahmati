import { daysLeft } from "@/lib/derive";
import { useSeen } from "@/lib/motion";

// The DPDP timeline drawn to scale, with today marked on it.

const START = Date.UTC(2025, 10, 13);
const END = Date.UTC(2027, 4, 13);
const MILESTONES = [
  { at: START, date: "13 Nov 2025", title: "DPDP Rules notified", body: "The 18-month countdown began and the Data Protection Board was set up." },
  { at: Date.UTC(2026, 10, 13), date: "13 Nov 2026", title: "Consent Manager rules begin", body: "Registered consent platforms can start operating." },
  { at: END, date: "13 May 2027", title: "Full compliance for every school", body: "Notices, consent, security, breach reporting and children's data rules all apply." },
];
const pos = (t: number) => Math.min(100, Math.max(0, ((t - START) / (END - START)) * 100));

export function DeadlineLine() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.4);
  const now = Date.now();
  const today = pos(now);
  const left = daysLeft();

  return (
    <div ref={ref} className="mx-auto max-w-[1200px] px-4 py-12 sm:px-8">
      <div className="relative mx-2 mb-10 mt-8 h-1.5 rounded-full bg-track sm:mx-0">
        <span className="timeline-fill absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: seen ? `${today}%` : "0%" }} />
        {MILESTONES.map((m) => (
          <span key={m.date} className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${m.at <= now ? "border-ink bg-ink" : m.at === END ? "border-amber bg-white" : "border-line-2 bg-white"}`} style={{ left: `${pos(m.at)}%` }} />
        ))}
        <span className="absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11.5px] font-semibold text-white" style={{ left: `${today}%` }}>
          Today · {left} days to go
        </span>
      </div>
      <ol className="grid gap-6 sm:grid-cols-3">
        {MILESTONES.map((m, i) => (
          <li key={m.date} className={`flex flex-col gap-1.5 ${i === 1 ? "sm:items-center sm:text-center" : i === 2 ? "sm:items-end sm:text-right" : ""}`}>
            <span className={`text-[13px] font-semibold tabular-nums ${m.at === END ? "text-amber-ink" : m.at <= now ? "text-muted-2" : "text-ink-2"}`}>{m.date}{m.at <= now && m.at !== END ? " · done" : ""}</span>
            <b className="text-[17px] font-semibold leading-snug">{m.title}</b>
            <p className="max-w-[320px] text-[14px] text-muted">{m.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
