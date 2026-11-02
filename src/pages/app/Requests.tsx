import { Check } from "lucide-react";
import { Pill } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { SLA_DAYS, dueDate, fmtDate, isLate, sortedRequests } from "@/lib/derive";
import { PageHead } from "./Layout";

const LABEL = { access: "See my child's data", correct: "Correct my child's data", delete: "Delete my child's data" } as const;

export default function Requests() {
  const db = useDB()!;
  const list = sortedRequests(db);
  return (
    <>
      <PageHead n="03" label="Parent requests" title="Requests from parents" desc={`Parents use the same WhatsApp link to ask to see, correct or delete their child's data. Each request is logged with a ${SLA_DAYS}-day reply target.`} />
      <div className="flex flex-col gap-2.5">
        {list.map((r) => {
          const s = db.students[r.sid];
          return (
            <div key={r.id} className="panel grid grid-cols-[1fr_auto] items-start gap-4 px-[18px] py-4">
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">{r.status === "done" ? <Pill kind="done" /> : isLate(r) ? <Pill kind="late" /> : <Pill kind="open" />}<b className="text-sm font-semibold">{LABEL[r.type]}</b></div>
                <p className="text-ink-2">{r.note || "No details added."}</p>
                <p className="mt-2 font-mono text-[11.5px] uppercase text-muted-2">{s?.parent} · {s?.name} · received {fmtDate(r.createdAt)}{r.status === "open" && ` · reply by ${fmtDate(dueDate(r))}`}</p>
              </div>
              {r.status === "open" && <button className="btn btn-sm" onClick={async () => { await actions.resolveRequest(r.id); toast("Request marked resolved"); }}><Check className="h-3.5 w-3.5" />Mark resolved</button>}
            </div>
          );
        })}
        {!list.length && (
          <div className="panel grid min-h-60 place-content-center justify-items-center gap-2 p-6 text-center">
            <h2 className="text-base font-semibold">No parent requests yet</h2>
            <p className="max-w-md text-[12.5px] text-muted-2">When a parent asks to see, correct or delete their child's data from their consent link, the request lands here with a due date.</p>
          </div>
        )}
      </div>
    </>
  );
}
