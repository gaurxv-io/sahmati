import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { AlertTriangle, Check } from "lucide-react";
import { Logo } from "@/components/brand";
import { useDB, verifyLedger } from "@/lib/store";
import { clsLabel, fmtTime } from "@/lib/derive";

/** Public receipt check: anyone (a parent, the Board, an auditor) can confirm a consent is on record and untampered. */
export default function Verify() {
  const { receipt = "" } = useParams({ strict: false }) as { receipt?: string };
  const db = useDB()!;
  const nav = useNavigate();
  const [input, setInput] = useState(receipt);
  const [chainOk, setChainOk] = useState<boolean | null>(null);
  const student = receipt ? Object.values(db.students).find((s) => s.receipt?.toUpperCase() === receipt.replace(/^#/, "").toUpperCase()) : undefined;
  const event = student && db.events.filter((e) => e.sid === student.id && ["consent", "update", "withdraw"].includes(e.type)).pop();

  useEffect(() => { if (student) verifyLedger(db.events).then((r) => setChainOk(r.ok)); }, [db.events, student]);
  const go = (e: FormEvent) => { e.preventDefault(); if (input.trim()) nav({ to: "/verify/$receipt", params: { receipt: encodeURIComponent(input.trim().replace(/^#/, "")) } }); };

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-[640px] items-center px-4 py-3.5"><Logo /><span className="ml-auto font-mono text-[11px] text-muted-2">RECEIPT CHECK</span></div></header>
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 py-10">
        <div className="grid gap-2">
          <span className="eyebrow">Verify a consent receipt</span>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Check that a parent's consent is on record</h1>
          <p className="text-muted">Enter the receipt number from the parent's WhatsApp confirmation. Sahmati checks it against the school's tamper-evident ledger.</p>
        </div>
        <form onSubmit={go} className="flex gap-2">
          <input id="receipt" aria-label="Receipt number" className="field min-h-11 flex-1 font-mono text-sm uppercase" placeholder="SAH-002-LKGB" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn btn-primary min-h-11" type="submit">Check</button>
        </form>

        {receipt && !student && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#F5C2BC] bg-danger-soft px-4 py-3 text-[13px] text-danger"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />No consent with receipt #{receipt} is on record. Check the number on the parent's confirmation.</div>
        )}

        {student && event && (
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <div className={`flex items-center gap-2.5 px-[18px] py-3.5 text-sm font-semibold ${chainOk === false ? "bg-danger-soft text-danger" : "bg-green-soft text-green"}`}>
              {chainOk === false ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" strokeWidth={2.6} />}
              {chainOk === false ? "Record found, but the school's ledger fails verification." : "Valid. This consent is on record and the ledger is intact."}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 px-[18px] py-4 text-[13px]">
              {([["Receipt", `#${student.receipt}`], ["School", db.school.name], ["Student", `${student.name} · ${clsLabel(student)}`], ["Recorded", fmtTime(event.ts) + " IST"], ["Consent", event.detail.split(" · ")[1] ?? event.detail], ["Ledger record", `#${event.seq}`], ["SHA-256", event.hash]] as const).map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-muted-2">{k}</dt><dd className={`m-0 break-all text-right ${k === "SHA-256" || k === "Receipt" ? "font-mono text-[11.5px]" : ""}`}>{v}</dd></div>
              ))}
            </dl>
          </div>
        )}
        <p className="text-xs text-muted-2">Try receipt <Link to="/verify/$receipt" params={{ receipt: "SAH-002-LKGB" }} className="font-mono">SAH-002-LKGB</Link> from the sample school.</p>
      </main>
    </div>
  );
}
