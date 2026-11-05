import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { PageHead } from "./Layout";
import { loadGroup, openSchool, useDB, type GroupRow } from "@/lib/store";
import { fmtDate } from "@/lib/derive";
import { downloadText } from "./Ledger";

type Key = "name" | "students" | "pct" | "pending" | "openRequests" | "openBreaches" | "met" | "lastActivity";
const COLS: [Key, string][] = [["name", "School"], ["students", "Students"], ["pct", "Consent"], ["pending", "Pending"], ["openRequests", "Open requests"], ["openBreaches", "Open breaches"], ["met", "Readiness"], ["lastActivity", "Last activity"]];
const pct = (r: GroupRow) => (r.students ? Math.round((r.recorded / r.students) * 100) : 0);

/** Group admin dashboard: every school in the group side by side. */
export default function Group() {
  const db = useDB()!;
  const nav = useNavigate();
  const [g, setG] = useState<Awaited<ReturnType<typeof loadGroup>> | null | undefined>(undefined);
  const [sort, setSort] = useState<{ k: Key; desc: boolean }>({ k: "name", desc: false });
  useEffect(() => { if (db.school.groupId) loadGroup(db.school.groupId).then(setG, () => setG(null)); else setG(null); }, [db.school.groupId, db.events.length]);

  const rows = useMemo(() => {
    const val = (r: GroupRow): string | number => (sort.k === "pct" ? pct(r) : sort.k === "lastActivity" ? r.lastActivity ?? "" : r[sort.k]);
    return (g?.schools ?? []).slice().sort((a, b) => { const x = val(a), y = val(b); const c = typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y)); return sort.desc ? -c : c; });
  }, [g, sort]);
  const sum = (k: keyof GroupRow) => rows.reduce((n, r) => n + (r[k] as number), 0);
  const tot = { students: sum("students"), recorded: sum("recorded"), pending: sum("pending"), openRequests: sum("openRequests"), overdue: sum("overdue"), openBreaches: sum("openBreaches"), met: sum("met"), steps: sum("steps") };

  const open = (slug: string) => { openSchool(slug); nav({ to: "/app" }); };
  const exportCsv = () => downloadText("sahmati-group.csv", "school,city,students,consent_pct,pending,open_requests,overdue_requests,open_breaches,readiness_met,readiness_steps,last_activity\n" +
    rows.map((r) => [`"${r.name}"`, `"${r.city}"`, r.students, pct(r), r.pending, r.openRequests, r.overdue, r.openBreaches, r.met, r.steps, r.lastActivity ?? ""].join(",")).join("\n"));

  return (
    <>
        {g === undefined && <p className="py-16 text-center text-muted-2">Loading…</p>}
        {g === null && <div className="panel p-6 text-center text-muted-2">This school isn't part of a group you can see.</div>}
        {g && (
          <>
            <PageHead n="09" label="Group view" title={g.name} desc={`${rows.length} schools. Click a school to open its console.${g.joinCode ? ` Group code ${g.joinCode.toUpperCase()}.` : ""}`}>
              <button className="btn" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button>
            </PageHead>
            <div className="panel min-w-0 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>{COLS.map(([k, l]) => <th key={k} className="th"><button className="font-[inherit] uppercase hover:text-ink" onClick={() => setSort({ k, desc: sort.k === k ? !sort.desc : k !== "name" })}>{l}{sort.k === k ? (sort.desc ? " ↓" : " ↑") : ""}</button></th>)}</tr></thead>
                <tbody>
                  <tr className="bg-canvas font-semibold">
                    <td className="td">All schools</td><td className="td tabular-nums">{tot.students}</td><td className="td tabular-nums">{tot.students ? Math.round((tot.recorded / tot.students) * 100) : 0}%</td><td className="td tabular-nums">{tot.pending}</td>
                    <td className="td tabular-nums">{tot.openRequests}{tot.overdue > 0 && <span className="text-danger"> · {tot.overdue} late</span>}</td><td className="td tabular-nums">{tot.openBreaches}</td><td className="td tabular-nums">{tot.met} / {tot.steps}</td><td className="td" />
                  </tr>
                  {rows.map((r) => (
                    <tr key={r.id} className="cursor-pointer hover:bg-[#FBFCFB] [&:last-child>td]:border-b-0" onClick={() => open(r.slug)}>
                      <td className="td"><b className="font-semibold text-ink">{r.name}</b><div className="font-mono text-[11.5px] text-muted-2">{r.city.toUpperCase()}</div></td>
                      <td className="td tabular-nums">{r.students}</td>
                      <td className="td tabular-nums"><span className={pct(r) >= 90 ? "text-green" : pct(r) < 60 ? "text-amber-ink" : ""}>{pct(r)}%</span></td>
                      <td className="td tabular-nums">{r.pending}</td>
                      <td className="td tabular-nums">{r.openRequests}{r.overdue > 0 && <span className="text-danger"> · {r.overdue} late</span>}</td>
                      <td className="td tabular-nums">{r.openBreaches > 0 ? <span className="text-danger">{r.openBreaches}</span> : 0}</td>
                      <td className="td tabular-nums">{r.met} / {r.steps}</td>
                      <td className="td whitespace-nowrap text-muted-2">{r.lastActivity ? fmtDate(r.lastActivity) : "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </>
  );
}
