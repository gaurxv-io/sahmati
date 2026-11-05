import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { sortedStudents, stats } from "@/lib/derive";
import type { DB, Student } from "@/lib/types";

// The landing page's "live" overview card. On first view the numbers count up and the bars
// fill; then a few sample parents "give consent" one by one so the card feels like a running
// product. It is all the demo school's sample data and is never written to the database.

const FEED_LIMIT = 5; // simulated consents before the card settles
const FEED_EVERY_MS = 4200;
const FEED_FIRST_MS = 2200;
const COUNT_MS = 900;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** Eases from the value it last showed to `target`. Starts at 0 until `active` first turns true. */
function useCountUp(target: number, active: boolean) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(shown);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) { setShown(target); return; }
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const value = begin + (target - begin) * (1 - (1 - t) ** 3);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);
  return Math.round(shown);
}

const shortName = (s: Student) => {
  const [first, ...rest] = s.name.split(" ");
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
};
const clsLabel = (cls: string) => (/^\d+$/.test(cls) ? `Class ${cls}` : cls);

export function HeroCard({ db }: { db: DB }) {
  const [ref, inView] = useInView<HTMLAnchorElement>();
  const [seen, setSeen] = useState(false);
  const [given, setGiven] = useState<string[]>([]);
  useEffect(() => { if (inView) setSeen(true); }, [inView]);

  const queue = useMemo(() => {
    const pending = sortedStudents(db).filter((s) => s.status === "pending");
    // Spread the picks across classes so different bars move.
    return pending.filter((_, i) => i % 3 === 0).slice(0, FEED_LIMIT);
  }, [db]);

  // Feed a new sample consent every few seconds while the card is on screen.
  useEffect(() => {
    if (!inView || prefersReducedMotion() || given.length >= queue.length) return;
    const t = setTimeout(() => {
      const next = queue[given.length];
      if (next) setGiven((g) => [...g, next.id]);
    }, given.length === 0 ? FEED_FIRST_MS : FEED_EVERY_MS);
    return () => clearTimeout(t);
  }, [inView, given, queue]);

  const st = useMemo(() => {
    if (!given.length) return stats(db);
    const students = { ...db.students };
    for (const id of given) { const s = students[id]; if (s) students[id] = { ...s, status: "given" }; }
    return stats({ ...db, students });
  }, [db, given]);

  const consent = useCountUp(st.cov * 100, seen);
  const pending = useCountUp(st.pending, seen);
  const readiness = useCountUp((st.ready / st.checks.length) * 100, seen);
  const latest = given.length ? db.students[given[given.length - 1]!] : undefined;

  return (
    <Link ref={ref} to="/app" className="hero-card group block rounded-2xl border border-line bg-white p-5 text-ink shadow-card hover:text-ink hover:shadow-lift">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-2">{db.school.slug}.sahmati.in · Overview</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="live-ping absolute inset-0 rounded-full bg-brand-hover" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-brand-hover" />
          </span>
          Live demo
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {([["Consent", `${consent}%`, "text-green"], ["Pending", String(pending), "text-amber-ink"], ["Readiness", `${readiness}%`, "text-ink"]] as const).map(([label, value, tone]) => (
          <div key={label} className="rounded-lg border border-line p-3">
            <div className="font-mono text-[10px] uppercase text-muted-2">{label}</div>
            <div className={`text-2xl font-semibold tracking-[-0.02em] tabular-nums ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {st.bands.map((b, i) => (
          <div key={b.name} className="group/row relative grid grid-cols-[96px_1fr_36px] items-center gap-3 text-[13px]">
            <span>{b.name}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-track">
              <span
                className={`hero-bar block h-full rounded-full ${b.pct < 0.8 ? "bg-amber" : "bg-brand-hover"}`}
                style={{ width: seen ? `${b.pct * 100}%` : "0%", transitionDelay: given.length ? "0ms" : `${i * 90}ms` }}
              />
            </span>
            <span className="text-right font-mono text-xs tabular-nums text-muted">{Math.round(b.pct * 100)}%</span>
            <span className="pointer-events-none absolute -top-7 right-10 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-mono text-[11px] text-white opacity-0 transition-opacity duration-150 group-hover/row:opacity-100">
              {b.done} of {b.total} parents responded
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 h-9" aria-live="polite">
        {!latest && (
          <div className="flex h-9 items-center gap-2 px-1 text-[12.5px] text-muted-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />Consent links sent on WhatsApp · {st.pending} parents yet to reply
          </div>
        )}
        {latest && (
          <div key={latest.id} className="feed-in flex h-9 items-center gap-2 rounded-lg border border-green-line bg-green-soft px-3 text-[12.5px] text-ink-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-hover text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
            <span className="min-w-0 truncate">Parent of <b className="font-semibold text-ink">{shortName(latest)}</b> ({clsLabel(latest.cls)}) gave consent on WhatsApp</span>
            <span className="ml-auto shrink-0 font-mono text-[10.5px] text-muted-2">just now</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3.5 text-[13px]">
        <span className="text-muted-2">Sample school with {Object.keys(db.students).length} students</span>
        <span className="inline-flex items-center gap-1 font-semibold text-green group-hover:text-green-hover">Open console <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
      </div>
    </Link>
  );
}
