import { useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { CLASS_ORDER } from "@/lib/derive";
import type { Student } from "@/lib/types";

// Students grouped the way a school thinks about them: class, then section.
// The tree sits beside the register on wide screens; phones get a dropdown instead.

export type Scope = { cls?: string; sec?: string };
export type Group = { cls: string; total: number; done: number; sections: { sec: string; total: number; done: number }[] };

export const clsName = (c: string) => (/^\d+$/.test(c) ? `Class ${c}` : c);
export const scopeName = (s: Scope) => (s.cls ? `${clsName(s.cls)}${s.sec ? ` – ${s.sec}` : ""}` : "All students");
export const inScope = (st: Student, s: Scope) => (!s.cls || st.cls === s.cls) && (!s.sec || st.sec === s.sec);
const isDone = (st: Student) => st.status !== "pending";
const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

export function groupStudents(students: Student[]): Group[] {
  const byCls = new Map<string, Student[]>();
  for (const s of students) byCls.set(s.cls, [...(byCls.get(s.cls) ?? []), s]);
  const order = (c: string) => { const i = CLASS_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  return [...byCls.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([cls, list]) => {
      const bySec = new Map<string, Student[]>();
      for (const s of list) bySec.set(s.sec, [...(bySec.get(s.sec) ?? []), s]);
      return {
        cls, total: list.length, done: list.filter(isDone).length,
        sections: [...bySec.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sec, l]) => ({ sec, total: l.length, done: l.filter(isDone).length })),
      };
    });
}

function Pct({ done, total }: { done: number; total: number }) {
  const p = pct(done, total);
  return <span className={`ml-auto shrink-0 font-mono text-[11px] tabular-nums ${p >= 90 ? "text-green" : p < 60 ? "text-amber-ink" : "text-muted-2"}`}>{p}%</span>;
}

export function ClassTree({ groups, total, scope, onPick }: { groups: Group[]; total: number; scope: Scope; onPick: (s: Scope) => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(scope.cls ? [scope.cls] : []));
  const toggle = (cls: string) => setOpen((p) => { const n = new Set(p); if (n.has(cls)) n.delete(cls); else n.add(cls); return n; });
  const row = "flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-left text-[13px]";
  const on = "bg-green-soft font-semibold text-ink";
  const off = "text-ink-2 hover:bg-subtle";

  return (
    <nav aria-label="Classes" className="flex flex-col gap-0.5">
      <button type="button" onClick={() => onPick({})} aria-current={!scope.cls ? "true" : undefined} className={`${row} ${!scope.cls ? on : off}`}>
        <Users className="h-3.5 w-3.5 shrink-0 text-muted-2" />All students<span className="ml-auto font-mono text-[11px] text-muted-2">{total}</span>
      </button>
      <span className="mt-2 px-2.5 pb-1 text-[11px] font-medium text-muted-3">Classes</span>
      {groups.map((g) => {
        const expanded = open.has(g.cls);
        const clsOn = scope.cls === g.cls && !scope.sec;
        return (
          <div key={g.cls}>
            <div className={`flex items-center rounded-lg ${clsOn ? on : off}`}>
              <button type="button" aria-label={`${expanded ? "Hide" : "Show"} sections of ${clsName(g.cls)}`} aria-expanded={expanded} onClick={() => toggle(g.cls)} className="grid h-8 w-7 shrink-0 place-items-center text-muted-2">
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
              </button>
              <button type="button" onClick={() => { onPick({ cls: g.cls }); setOpen((p) => new Set(p).add(g.cls)); }} aria-current={clsOn ? "true" : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-[7px] pr-2.5 text-left text-[13px]">
                <span className="truncate">{clsName(g.cls)}</span>
                <span className="font-mono text-[11px] font-normal text-muted-3">{g.total}</span>
                <Pct done={g.done} total={g.total} />
              </button>
            </div>
            {expanded && (
              <div className="ml-[22px] flex flex-col gap-0.5 border-l border-line py-0.5 pl-1.5">
                {g.sections.map((s) => {
                  const secOn = scope.cls === g.cls && scope.sec === s.sec;
                  return (
                    <button key={s.sec} type="button" onClick={() => onPick({ cls: g.cls, sec: s.sec })} aria-current={secOn ? "true" : undefined} className={`${row} py-1.5 ${secOn ? on : off}`}>
                      Section {s.sec}<span className="font-mono text-[11px] font-normal text-muted-3">{s.total}</span><Pct done={s.done} total={s.total} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Phone version of the tree: one dropdown with every class and section. */
export function ClassSelect({ groups, total, scope, onPick }: { groups: Group[]; total: number; scope: Scope; onPick: (s: Scope) => void }) {
  const value = scope.cls ? `${scope.cls}|${scope.sec ?? ""}` : "";
  return (
    <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted-2">Class and section
      <select className="field min-h-10 text-sm text-ink" value={value} onChange={(e) => { const [cls, sec] = e.target.value.split("|"); onPick(cls ? { cls, ...(sec ? { sec } : {}) } : {}); }}>
        <option value="">All students ({total})</option>
        {groups.map((g) => (
          <optgroup key={g.cls} label={clsName(g.cls)}>
            <option value={`${g.cls}|`}>{clsName(g.cls)}, all sections ({g.total})</option>
            {g.sections.map((s) => <option key={s.sec} value={`${g.cls}|${s.sec}`}>{clsName(g.cls)} – {s.sec} ({s.total} · {pct(s.done, s.total)}%)</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
