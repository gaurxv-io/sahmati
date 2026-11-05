import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import { chainString } from "@/lib/sample";
import { sha256 } from "@/lib/hash";
import { fmtTime } from "@/lib/derive";
import type { DB, LedgerEvent } from "@/lib/types";

// "Try to cheat the ledger": the sample school's last few real consent records, hash-chained.
// Flip a parent's answer and the chain is re-verified in the browser, exactly as the console
// does it. Nothing is saved.

const ROWS = 5;
const CHOICES = [["web", "Photos on website"], ["newsletter", "Newsletter"]] as const;

const flip = (detail: string, key: string) => detail.replace(new RegExp(`\\b${key} (yes|no)\\b`), (_, v: string) => `${key} ${v === "yes" ? "no" : "yes"}`);
const value = (detail: string, key: string) => new RegExp(`\\b${key} yes\\b`).test(detail);

type Check = { hash: string; ok: boolean };

export function TamperDemo({ db }: { db: DB }) {
  // A run of consecutive ledger records (so each really points at the one above it),
  // starting a few consents from the end.
  const events = useMemo(() => {
    const consentAt = db.events.flatMap((e, i) => (e.type === "consent" ? [i] : []));
    const start = consentAt[Math.max(0, consentAt.length - (ROWS - 1))] ?? Math.max(0, db.events.length - ROWS);
    return db.events.slice(start, start + ROWS);
  }, [db.events]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [checks, setChecks] = useState<Check[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const out: Check[] = [];
      let carried: string | null = null; // recomputed hash of the row above, once something has changed
      for (const e of events) {
        const detail = edits[e.seq] ?? e.detail;
        const prev = carried ?? e.prev;
        const hash = await sha256(chainString(prev, { ...e, detail }));
        const ok = hash === e.hash;
        out.push({ hash, ok });
        carried = ok ? null : hash;
      }
      if (live) setChecks(out);
    })();
    return () => { live = false; };
  }, [events, edits]);

  const firstBad = checks?.findIndex((c) => !c.ok) ?? -1;
  const broken = checks ? checks.filter((c) => !c.ok).length : 0;
  const tampered = Object.keys(edits).length > 0;

  const toggle = (e: LedgerEvent, key: string) =>
    setEdits((p) => {
      const next = flip(p[e.seq] ?? e.detail, key);
      const copy = { ...p };
      if (next === e.detail) delete copy[e.seq]; else copy[e.seq] = next;
      return copy;
    });

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <p className="text-[15.5px] leading-relaxed text-muted">
          These are {events.length} records from the sample school's ledger. Each one carries a fingerprint (SHA-256) of itself and of the record before it.
        </p>
        <p className="text-[15.5px] leading-relaxed text-ink-2"><b className="font-semibold">Try it:</b> quietly change a parent's answer, the way someone might edit a spreadsheet. Then watch what the chain says.</p>
        <div aria-live="polite" className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[14px] font-semibold ${broken ? "border-[#F5C2BC] bg-danger-soft text-danger" : "border-green-line bg-green-soft text-green"}`}>
          {broken ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.6} />}
          <span>
            {!checks ? "Verifying…" : broken
              ? <>Tampering detected at record #{events[firstBad]!.seq}. {broken > 1 ? `${broken - 1} later ${broken - 1 === 1 ? "record no longer matches" : "records no longer match"} either.` : ""}</>
              : `All ${events.length} records verified. Nothing has been changed.`}
          </span>
        </div>
        {tampered && (
          <button type="button" className="btn w-fit" onClick={() => setEdits({})}><RotateCcw className="h-3.5 w-3.5" />Undo my changes</button>
        )}
        <p className="text-[13px] text-muted-2">In the real console, the same check runs over every record when anyone presses Verify chain, and on every receipt a parent or inspector checks.</p>
      </div>

      <ol className="flex flex-col">
        {events.map((e, i) => {
          const c = checks?.[i];
          const bad = c ? !c.ok : false;
          const s = db.students[e.sid];
          const detail = edits[e.seq] ?? e.detail;
          return (
            <li key={e.seq} className="relative">
              {i > 0 && <span className={`chain-link mx-auto block h-5 w-0.5 ${bad ? "bg-danger" : "bg-line-2"}`} aria-hidden />}
              <div className={`chain-block rounded-xl border bg-white px-4 py-3 ${bad ? "chain-bad border-danger" : "border-line"}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <b className="font-mono text-[12px] text-muted-2">#{e.seq}</b>
                  <b className="text-[14.5px] font-semibold text-ink">{s?.name ?? (e.type === "consent" ? e.sid : e.type === "withdraw" ? "Withdrawal" : "School office")}</b>
                  <span className="text-[12.5px] text-muted-2">{fmtTime(e.ts)}</span>
                  <span className={`ml-auto rounded px-1.5 py-0.5 font-mono text-[11px] ${bad ? "bg-danger-soft text-danger" : "bg-subtle text-muted"}`}>
                    {bad ? <>fingerprint {c!.hash.slice(0, 8)} ≠ {e.hash.slice(0, 8)}</> : <>fingerprint {e.hash.slice(0, 8)}</>}
                  </span>
                </div>
                {e.type !== "consent" ? <p className="mt-1.5 text-[12.5px] text-muted">{e.detail}</p> : (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="text-muted-2">Parent said:</span>
                  {CHOICES.map(([key, label]) => {
                    const yes = value(detail, key);
                    const changed = value(e.detail, key) !== yes;
                    return (
                      <button key={key} type="button" onClick={() => toggle(e, key)} aria-pressed={changed}
                        className={`rc-choice rounded-md border px-2 py-1 ${changed ? "border-danger bg-danger-soft font-semibold text-danger" : "border-line-2 bg-white text-ink-2 hover:border-muted-3"}`}>
                        {label}: <b className="font-semibold">{yes ? "Yes" : "No"}</b>
                      </button>
                    );
                  })}
                </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
