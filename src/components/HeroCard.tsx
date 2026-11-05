import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { stats } from "@/lib/derive";
import { useCountUp } from "@/lib/motion";
import type { DB, Student } from "@/lib/types";

// The school's side of the hero demo: the consent register. `given` lists the sample students
// whose parents have just consented on the phone beside it. Their consent is shown here only and
// never written to the database; the older ledger rows are the sample school's real records.

export const shortName = (s: Pick<Student, "name">) => {
  const [first, ...rest] = s.name.split(" ");
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : (first ?? s.name);
};
export const clsName = (cls: string) => (/^\d+$/.test(cls) ? `Class ${cls}` : cls);

/** A stable, hash-looking hex string for demo rows that have no real ledger hash. */
export const demoHash = (seed: string) => {
  let h = 2166136261;
  let out = "";
  for (let round = 0; out.length < 64; round++) {
    for (const ch of seed + round) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
};

const R = 34;
const RING = 2 * Math.PI * R;

type Row = { key: string; name: string; cls: string; seq: number; hash: string; fresh: boolean };

export function HeroCard({ db, given, seen }: { db: DB; given: string[]; seen: boolean }) {
  const st = useMemo(() => {
    if (!given.length) return stats(db);
    const students = { ...db.students };
    for (const id of given) { const s = students[id]; if (s) students[id] = { ...s, status: "given" }; }
    return stats({ ...db, students });
  }, [db, given]);

  const rows = useMemo<Row[]>(() => {
    const real = db.events.filter((e) => e.type === "consent").slice(-3);
    const lastSeq = db.events.at(-1)?.seq ?? 0;
    const older: Row[] = real.map((e) => {
      const s = db.students[e.sid];
      return { key: e.hash, name: s ? shortName(s) : e.sid, cls: s ? clsName(s.cls) : "", seq: e.seq, hash: e.hash, fresh: false };
    });
    const fresh: Row[] = given.map((id, i) => {
      const s = db.students[id]!;
      return { key: `demo-${id}`, name: shortName(s), cls: clsName(s.cls), seq: lastSeq + i + 1, hash: demoHash(id), fresh: true };
    });
    return [...older, ...fresh].reverse().slice(0, 3);
  }, [db, given]);

  const consent = useCountUp(st.cov * 100, seen);
  const pending = useCountUp(st.pending, seen);
  const readiness = useCountUp((st.ready / st.checks.length) * 100, seen);

  return (
    <Link to="/app" className="hero-card group relative block rounded-[20px] border border-line bg-white p-5 text-ink hover:text-ink">
      {given.length > 0 && <span key={given.length} className="sync-glow pointer-events-none absolute inset-0 rounded-[20px]" aria-hidden />}
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col leading-tight">
          <b className="truncate text-[13.5px] font-semibold">{db.school.name}</b>
          <span className="text-[12px] text-muted-2">Consent register</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-soft px-2.5 py-1 text-[11.5px] font-medium text-green">
          <span className="relative flex h-1.5 w-1.5">
            <span className="live-ping absolute inset-0 rounded-full bg-brand-hover" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-brand-hover" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="42" cy="42" r={R} fill="none" stroke="var(--color-track)" strokeWidth="8" />
            <circle cx="42" cy="42" r={R} fill="none" stroke="var(--color-brand-hover)" strokeWidth="8" strokeLinecap="round"
              className="ring-arc" strokeDasharray={RING} strokeDashoffset={RING * (1 - (seen ? st.cov : 0))} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center leading-none">
            <span><b className="block text-[21px] font-semibold tracking-[-0.03em] tabular-nums">{consent}%</b><span className="text-[10.5px] text-muted-2">consented</span></span>
          </span>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-2">
          <div className="rounded-xl bg-amber-soft px-3 py-2.5"><dt className="text-[11.5px] text-amber-ink">Pending</dt><dd className="m-0 text-[22px] font-semibold leading-tight tabular-nums text-amber-ink">{pending}</dd></div>
          <div className="rounded-xl bg-subtle px-3 py-2.5"><dt className="text-[11.5px] text-muted">Readiness</dt><dd className="m-0 text-[22px] font-semibold leading-tight tabular-nums">{readiness}%</dd></div>
        </dl>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {st.bands.map((b, i) => (
          <div key={b.name} className="group/row relative grid grid-cols-[88px_1fr_32px] items-center gap-2.5 text-[12.5px]">
            <span className="text-ink-2">{b.name}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-track">
              <span className={`hero-bar block h-full rounded-full ${b.pct < 0.8 ? "bg-amber" : "bg-brand-hover"}`}
                style={{ width: seen ? `${b.pct * 100}%` : "0%", transitionDelay: given.length ? "0ms" : `${i * 90}ms` }} />
            </span>
            <span className="text-right text-[11.5px] tabular-nums text-muted">{Math.round(b.pct * 100)}%</span>
            <span className="pointer-events-none absolute -top-7 right-8 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-150 group-hover/row:opacity-100">
              {b.done} of {b.total} parents responded
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-line bg-canvas p-1.5" aria-live="polite">
        <span className="block px-2 pb-1 pt-0.5 text-[11px] text-muted-2">Ledger, newest first</span>
        <ul className="flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.key} className={`flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-[12px] ${r.fresh ? "ledger-new" : ""}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.fresh ? "bg-brand-hover" : "bg-line-2"}`} />
              <span className="min-w-0 flex-1 truncate"><b className="font-semibold text-ink">{r.name}</b> <span className="text-muted-2">{r.cls}</span></span>
              <span className="shrink-0 rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-muted">#{r.seq} · {r.hash.slice(0, 6)}</span>
            </li>
          ))}
        </ul>
      </div>

      <span className="mt-4 flex items-center justify-between text-[12.5px]">
        <span className="text-muted-2">Sample school, {Object.keys(db.students).length} students</span>
        <span className="inline-flex items-center gap-1 font-semibold text-green group-hover:text-green-hover">Open console <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
      </span>
    </Link>
  );
}
