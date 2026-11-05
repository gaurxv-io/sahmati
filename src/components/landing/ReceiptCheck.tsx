import { useState, type FormEvent } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { checkReceipt } from "@/lib/store";
import { clsLabel, fmtTime } from "@/lib/derive";

// A working receipt check on the landing page, against the sample school's real ledger.

const SAMPLE = "SAH-002-LKGB";
type Found = Awaited<ReturnType<typeof checkReceipt>>;

export function ReceiptCheck() {
  const [input, setInput] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null | undefined>(undefined);

  const check = async (e: FormEvent) => {
    e.preventDefault();
    const code = input.trim().replace(/^#/, "").toUpperCase();
    if (!code) return;
    setBusy(true);
    try { setFound(await checkReceipt(code)); } catch { setFound(null); } finally { setBusy(false); }
  };

  const ok = found && found.chainOk !== false;

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
      <form onSubmit={check} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="lp-receipt" className="sr-only">Receipt number</label>
        <input id="lp-receipt" className="field min-h-11 flex-1 font-mono text-sm uppercase" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary min-h-11" type="submit" disabled={busy}>{busy ? "Checking…" : "Check receipt"}</button>
      </form>
      <p className="mt-2 text-[12.5px] text-muted-2">This is a receipt from the sample school. Change a character to see what a fake looks like.</p>

      {found === null && (
        <div className="feed-in mt-4 flex items-start gap-2.5 rounded-xl border border-[#F5C2BC] bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />No consent with this receipt number is on record.
        </div>
      )}

      {found && (
        <div key={found.event?.hash ?? found.student.receipt} className="feed-in mt-4 overflow-hidden rounded-xl border border-line">
          <div className={`flex items-center gap-2.5 px-4 py-3 text-[13.5px] font-semibold ${ok ? "bg-green-soft text-green" : "bg-danger-soft text-danger"}`}>
            {ok ? <Check className="h-4 w-4" strokeWidth={2.6} /> : <AlertTriangle className="h-4 w-4" />}
            {ok ? "Valid. On record, and the ledger is intact." : "Found, but the school's ledger fails verification."}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 px-4 py-3.5 text-[13px]">
            {([["School", found.school], ["Student", `${found.student.name} · ${clsLabel(found.student)}`], ...(found.event ? [["Recorded", `${fmtTime(found.event.ts)} IST`], ["Ledger record", `#${found.event.seq}`], ["SHA-256", found.event.hash]] : [])] as const).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-2">{k}</dt>
                <dd className={`m-0 break-all text-right ${k === "SHA-256" ? "hash-reveal font-mono text-[11px] text-ink-2" : "text-ink"}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
