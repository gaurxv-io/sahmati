import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Crest, Logo, Seal } from "@/components/brand";
import { loadPublicSchool, type PublicSchool as PS } from "@/lib/store";
import { fmtDate } from "@/lib/derive";

/** Public DPDP Ready page for a school. School-level steps only, never student data. */
export default function PublicSchool() {
  const { slug } = useParams({ from: "/s/$slug" });
  const nav = useNavigate();
  const [s, setS] = useState<PS | null | undefined>(undefined);
  const [receipt, setReceipt] = useState("");
  const [notice, setNotice] = useState(false);
  useEffect(() => { loadPublicSchool(slug).then(setS, () => setS(null)); }, [slug]);
  const go = (e: FormEvent) => { e.preventDefault(); if (receipt.trim()) nav({ to: "/verify/$receipt", params: { receipt: receipt.trim().replace(/^#/, "") } }); };

  const met = s ? s.checks.filter((c) => c.ok).length : 0;
  const earned = !!s && met === s.checks.length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-[720px] items-center px-4 py-3.5"><Logo /><span className="ml-auto font-mono text-[11px] text-muted-2">DPDP STATUS</span></div></header>
      <main className="mx-auto flex max-w-[720px] flex-col gap-5 px-4 py-10">
        {s === undefined && <p className="py-16 text-center text-muted-2">Loading…</p>}
        {s === null && (
          <div className="panel grid justify-items-center gap-2 px-6 py-14 text-center">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">No school at this address</h1>
            <p className="text-[13.5px] text-muted">Check the link on the school's brochure or notice board.</p>
          </div>
        )}
        {s && (
          <>
            <div className="flex items-center gap-3">
              <Crest name={s.name} className="h-11 w-11 text-[15px]" />
              <div className="min-w-0"><h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{s.name}</h1><div className="font-mono text-[11px] text-muted-2">{s.city.toUpperCase()}</div></div>
            </div>

            <div className="panel flex flex-col items-center gap-5 p-[18px] sm:flex-row sm:items-center sm:p-6">
              <Seal earned={earned} size="lg" />
              <div className="flex flex-col gap-1.5 text-center sm:text-left">
                <span className="eyebrow">DPDP Ready School</span>
                <p className="text-[20px] font-semibold tracking-[-0.02em]">{earned ? "Earned" : `In progress: ${met} of ${s.checks.length} steps`}</p>
                <p className="text-[13px] text-muted">How this school protects children's data under India's Digital Personal Data Protection Act. DPDP Ready is Sahmati's own standard, not a government certificate.</p>
                {s.updatedAt && <span className="font-mono text-[11px] text-muted-2">LAST UPDATED {fmtDate(s.updatedAt).toUpperCase()}</span>}
              </div>
            </div>

            <div className="panel">
              <div className="flex items-center justify-between px-[18px] pt-4"><h2 className="text-base font-semibold">Steps</h2><span className="eyebrow">{met} / {s.checks.length}</span></div>
              <div className="px-[18px] pb-[18px] pt-3">
                {s.checks.map((c) => (
                  <div key={c.title} className="grid grid-cols-[22px_1fr_auto] items-center gap-3 border-t border-line py-3 text-[13.5px] first:border-t-0">
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-[1.5px] ${c.ok ? "border-green bg-green" : "border-line-2"}`}>{c.ok && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span>
                    <span className="font-medium">{c.title}</span>
                    <span className={`font-mono text-[11px] ${c.ok ? "text-green" : "text-amber-ink"}`}>{c.ok ? "MET" : "OPEN"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="panel flex flex-col gap-2 p-[18px]">
                <span className="eyebrow">Data protection contact</span>
                <p className="font-semibold">{s.dpo || "School office"}</p>
                <p className="text-[13px] text-muted">Parents can ask to see, correct or delete their child's data from their consent link, or contact this person.</p>
                <button className="w-fit text-sm font-semibold text-green hover:underline" onClick={() => setNotice(!notice)}>{notice ? "Hide the privacy notice" : "Read the privacy notice"}</button>
              </div>
              <form onSubmit={go} className="panel flex flex-col gap-2 p-[18px]">
                <span className="eyebrow">Verify a consent receipt</span>
                <p className="text-[13px] text-muted">Enter the receipt number from your WhatsApp confirmation.</p>
                <div className="flex gap-2">
                  <input aria-label="Receipt number" className="field min-h-10 min-w-0 flex-1 font-mono text-sm uppercase" placeholder="SAH-002-LKGB" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
                  <button className="btn btn-primary" type="submit">Check</button>
                </div>
              </form>
            </div>

            {notice && (
              <div id="notice" className="panel flex flex-col gap-3 p-[18px] text-[13.5px]">
                <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Privacy notice</h2><span className="font-mono text-xs text-muted-2">{s.noticeVersion.toUpperCase()} · ENGLISH, HINDI</span></div>
                <p><b className="font-semibold">What the school keeps.</b> Name, class, photo, address, parent contact, marks, attendance and medical notes.</p>
                <p><b className="font-semibold">Why.</b> Teaching, report cards, school transport, and contacting you in an emergency.</p>
                <p><b className="font-semibold">Your choices.</b> School records are required to run the school. Photos on the website, social media and newsletter are optional, and you can change or withdraw them at any time, free, from your consent link.</p>
                <p><b className="font-semibold">Your rights.</b> Ask to see, correct or delete your child's data. The school replies within 7 days. Contact: {s.dpo || "the school office"}.</p>
              </div>
            )}
          </>
        )}
        <footer className="border-t border-line pt-4 text-center font-mono text-[11px] text-muted-2">POWERED BY <Link to="/" className="font-semibold text-ink">SAHMATI</Link> · DPDP COMPLIANCE FOR INDIAN SCHOOLS</footer>
      </main>
    </div>
  );
}
