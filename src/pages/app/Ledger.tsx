import { useState } from "react";
import { AlertTriangle, Check, Download, ShieldCheck } from "lucide-react";
import { toast } from "@/components/toast";
import { actions, useDB, verifyLedger } from "@/lib/store";
import { can, clsLabel, fmtTime } from "@/lib/derive";
import { PageHead } from "./Layout";

export function ledgerCsv(db: ReturnType<typeof useDB>) {
  return "seq,timestamp_utc,event,student_id,student,detail,prev_hash,hash\n" + db!.events.map((e) => [e.seq, e.ts, e.type, e.sid, db!.students[e.sid]?.name ?? "", `"${e.detail.replace(/"/g, '""')}"`, e.prev, e.hash].join(",")).join("\n");
}
export function downloadText(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Ledger() {
  const db = useDB()!;
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const verify = async () => {
    const r = await verifyLedger(db.events);
    setResult(r.ok ? { ok: true, msg: `All ${r.count} records verified. Every SHA-256 hash matches its record and links to the one before it.` } : { ok: false, msg: `Chain broken at record #${r.seq}. That record was changed after it was written, so it fails verification.` });
  };
  return (
    <>
      <PageHead n="04" label="Consent ledger" title="Every consent, on the record" desc="Records are only ever added, never edited. Each one stores a SHA-256 hash of itself and the record before it, so changing any past record breaks the chain and shows up on verification.">
        {can(db).export && <button className="btn" onClick={() => { downloadText("sahmati-consent-ledger.csv", ledgerCsv(db)); actions.logAccess("export", "-", "Exported consent ledger CSV"); }}><Download className="h-4 w-4" />Export CSV</button>}
        <button className="btn" onClick={async () => { const seq = await actions.tamper(); setResult(null); toast(`Record #${seq} edited behind Sahmati's back. Run Verify chain.`); }}><AlertTriangle className="h-4 w-4" />Simulate tampering</button>
        <button className="btn btn-primary" onClick={verify}><ShieldCheck className="h-4 w-4" />Verify chain</button>
      </PageHead>
      {result && (
        <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] ${result.ok ? "border-green-line bg-green-soft text-green" : "border-[#F5C2BC] bg-danger-soft text-danger"}`}>
          {result.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{result.msg}{!result.ok && " Use Reset demo in the top bar to restore the sample data."}</span>
        </div>
      )}
      <div className="panel overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr><th className="th">#</th><th className="th">Time (IST)</th><th className="th">Event</th><th className="th">Student</th><th className="th">Hash</th></tr></thead>
          <tbody>
            {db.events.slice().reverse().map((e) => {
              const s = db.students[e.sid];
              return (
                <tr key={e.seq} className="[&:last-child>td]:border-b-0">
                  <td className="td font-mono text-muted-2 tabular-nums">{String(e.seq).padStart(4, "0")}</td>
                  <td className="td whitespace-nowrap tabular-nums">{fmtTime(e.ts)}</td>
                  <td className="td">{e.detail}</td>
                  <td className="td">{s ? <>{s.name}<div className="font-mono text-[11.5px] text-muted-2">{clsLabel(s)}</div></> : <span className="text-muted-2">School</span>}</td>
                  <td className="td"><span className="font-mono text-[11.5px] text-muted-2" title={e.hash}>{e.hash.slice(0, 10)}…{e.hash.slice(-4)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
