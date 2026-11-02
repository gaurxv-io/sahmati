import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { actions, useDB } from "@/lib/store";
import { can, fmtTime, roleLabel } from "@/lib/derive";
import { downloadText } from "./Ledger";
import { PageHead } from "./Layout";

const ACTION = { view: "Viewed", export: "Exported", change: "Changed" } as const;

export default function AccessLog() {
  const db = useDB()!;
  const perm = can(db);
  const [f, setF] = useState({ person: "", student: "", action: "", from: "", to: "" });
  const people = useMemo(() => [...new Set(db.access.map((a) => a.actor))].sort(), [db.access]);
  const rows = useMemo(() => db.access.filter((a) => {
    if (f.person && a.actor !== f.person) return false;
    if (f.action && a.action !== f.action) return false;
    if (f.student) { const s = db.students[a.sid]; if (!s || !s.name.toLowerCase().includes(f.student.toLowerCase())) return false; }
    const day = new Date(a.at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  }), [db, f]);

  if (!perm.log) return <div className="panel p-6 text-center text-muted-2">The access log is visible to the Principal and the Auditor.</div>;

  const exportCsv = () => {
    const csv = "time_utc,person,role,action,student,detail\n" + rows.map((a) => [a.at, `"${a.actor.replace(/"/g, '""')}"`, a.role, a.action, `"${db.students[a.sid]?.name ?? ""}"`, `"${a.detail.replace(/"/g, '""')}"`].join(",")).join("\n");
    downloadText("sahmati-access-log.csv", csv);
    actions.logAccess("export", "-", `Exported access log CSV (${rows.length} rows)`);
  };

  return (
    <>
      <PageHead n="08" label="Access log" title="Who looked at or changed what" desc="Every view of a student's record or data pack, every export, and every change. Changes are written by the database in the same step as the ledger record.">
        {db.me.role === "principal" && <button className="btn" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button>}
      </PageHead>
      <div className="panel min-w-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-3">
          <select aria-label="Person" className="field" value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })}><option value="">Everyone</option>{people.map((p) => <option key={p}>{p}</option>)}</select>
          <select aria-label="Action" className="field" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })}><option value="">All actions</option><option value="view">Viewed</option><option value="export">Exported</option><option value="change">Changed</option></select>
          <input aria-label="Student" type="search" className="field w-full sm:w-44" placeholder="Student name" value={f.student} onChange={(e) => setF({ ...f, student: e.target.value })} />
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted-2">From<input type="date" aria-label="From date" className="field" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted-2">To<input type="date" aria-label="To date" className="field" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
          <span className="font-mono text-[11px] text-muted-2 sm:ml-auto">{rows.length} ROWS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Time (IST)</th><th className="th">Person</th><th className="th">Action</th><th className="th">Student</th><th className="th">Detail</th></tr></thead>
            <tbody>
              {rows.slice(0, 500).map((a) => {
                const s = db.students[a.sid];
                return (
                  <tr key={a.id} className="[&:last-child>td]:border-b-0">
                    <td className="td whitespace-nowrap tabular-nums">{fmtTime(a.at)}</td>
                    <td className="td whitespace-nowrap">{a.actor}<div className="font-mono text-[11px] uppercase text-muted-2">{a.role === "parent" ? "Parent" : roleLabel(a.role)}</div></td>
                    <td className="td"><span className={`tag ${a.action === "change" ? "tag-on" : ""}`}>{ACTION[a.action].toUpperCase()}</span></td>
                    <td className="td whitespace-nowrap">{s ? s.name : a.sid === "-" ? <span className="text-muted-2">School</span> : <span className="font-mono text-[11.5px] text-muted-2">{a.sid}</span>}</td>
                    <td className="td">{a.detail}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={5} className="td py-9 text-center text-muted-2">Nothing matches these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
