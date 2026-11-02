import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Clock, Printer } from "lucide-react";
import { Logo } from "@/components/brand";
import PackView from "@/components/PackView";
import { loadPack, type PackData } from "@/lib/store";
import { fmtDate } from "@/lib/derive";

/** Parent's private, read-only data pack. No sign-in; the link itself is the key. */
export default function ParentPack() {
  const { token } = useParams({ from: "/p/$token" });
  const [pack, setPack] = useState<PackData | "expired" | "error" | null>(null);
  useEffect(() => { loadPack(token).then(setPack, () => setPack("error")); }, [token]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white print:hidden"><div className="mx-auto flex max-w-[860px] items-center px-4 py-3.5"><Logo /><span className="ml-auto font-mono text-[11px] text-muted-2">PARENT DATA PACK</span></div></header>
      <main className="mx-auto flex max-w-[860px] flex-col gap-5 px-4 py-8">
        {pack === null && <p className="py-16 text-center text-muted-2">Opening the data pack…</p>}
        {(pack === "expired" || pack === "error") && (
          <div className="panel grid justify-items-center gap-3 px-6 py-14 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-subtle"><Clock className="h-5 w-5 text-muted-2" /></span>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{pack === "error" ? "We couldn't open this link right now" : "This link has expired"}</h1>
            <p className="max-w-[420px] text-[13.5px] text-muted">{pack === "error" ? "Check your internet connection and try again." : "Data pack links work for 7 days and the school can turn them off. Ask the school office to send you a fresh link."}</p>
            <p lang="hi" className="max-w-[420px] font-hi text-[13.5px] text-muted">{pack === "error" ? "इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।" : "यह लिंक अब काम नहीं करता। स्कूल कार्यालय से नया लिंक माँगें।"}</p>
            <Link to="/" className="mt-2 text-sm font-semibold">About Sahmati</Link>
          </div>
        )}
        {pack && typeof pack === "object" && (
          <>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="font-mono text-[11px] text-muted-2">READ-ONLY · LINK WORKS UNTIL {fmtDate(pack.expiresAt).toUpperCase()}</span>
              <button className="btn btn-sm ml-auto" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />Print or save PDF</button>
            </div>
            <div className="panel p-[18px] sm:p-7 print:border-0 print:p-0">
              <PackView school={pack.school} student={pack.student} events={pack.events} requests={pack.requests} vendors={pack.vendors} preparedAt={pack.createdAt} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
