import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Copy, MessageCircle, Printer, X } from "lucide-react";
import PackView from "@/components/PackView";
import { Pill } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { can, fmtDate, packLink } from "@/lib/derive";
import { copyText } from "@/lib/clipboard";
import { MSG, fill } from "@/lib/i18n";

export default function Pack() {
  const { sid } = useParams({ from: "/app/students_/$sid/pack" });
  const db = useDB()!;
  const s = db.students[sid];
  const perm = can(db);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (s) actions.logAccess("view", sid, "Viewed data pack"); }, [sid, !!s]);

  if (!s) return <div className="panel p-6 text-center text-muted-2">This student isn't in your view. <Link to="/app/students" className="font-semibold">Back to students</Link></div>;

  const now = new Date().toISOString();
  const packs = db.packs.filter((p) => p.sid === sid);
  const waText = (url: string) => fill((MSG[s.lang] ?? MSG.en).pack, { parent: s.parent, school: db.school.name, student: s.name, link: url });
  const wa = (url: string) => `https://wa.me/91${s.phone}?text=${encodeURIComponent(waText(url))}`;

  const share = async () => {
    // Open the tab now so the browser doesn't block it after the link is created.
    const w = window.open("", "_blank");
    setBusy(true);
    try {
      const r = await actions.createPack(sid);
      const url = packLink(r.token);
      setLink(url);
      if (w) w.location.href = wa(url);
      toast("Private link created · logged in the ledger");
    } catch { w?.close(); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link to="/app/students" className="btn btn-ghost btn-sm"><ArrowLeft className="h-3.5 w-3.5" />Students</Link>
        <span className="eyebrow">02 · Data pack</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn" onClick={() => window.print()}><Printer className="h-4 w-4" />Print or save PDF</button>
          {perm.write && <button className="btn btn-primary" disabled={busy} onClick={share}><MessageCircle className="h-4 w-4" />Send to parent on WhatsApp</button>}
        </div>
      </div>

      {link && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-green-line bg-green-soft px-3.5 py-3 text-[13px] text-green print:hidden">
          <span className="min-w-0 flex-1 break-all font-mono text-[11.5px]">{link}</span>
          <a className="btn btn-sm" target="_blank" rel="noopener" href={wa(link)}><MessageCircle className="h-3.5 w-3.5" />Open WhatsApp</a>
          <button className="btn btn-sm" onClick={() => copyText(link, "Link copied")}><Copy className="h-3.5 w-3.5" />Copy</button>
        </div>
      )}

      <div className="panel p-[18px] sm:p-7 print:border-0 print:p-0">
        <PackView school={db.school} student={s} events={db.events.filter((e) => e.sid === sid)} requests={Object.values(db.requests).filter((r) => r.sid === sid)} vendors={db.vendors} preparedAt={now} />
      </div>

      {packs.length > 0 && (
        <div className="panel print:hidden">
          <div className="px-[18px] pt-4"><h2 className="text-base font-semibold">Links shared with the parent</h2></div>
          <div className="px-[18px] pb-3 pt-2">
            {packs.map((p) => {
              const live = !p.revokedAt && Date.parse(p.expiresAt) > Date.now();
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 text-[13px] first:border-t-0">
                  <span><span className="font-mono text-[11.5px] text-muted-2">{p.id.toUpperCase()}</span> · shared {fmtDate(p.createdAt)} by {p.createdBy}<br /><span className="font-mono text-[11px] text-muted-2">{p.revokedAt ? `REVOKED ${fmtDate(p.revokedAt).toUpperCase()}` : `EXPIRES ${fmtDate(p.expiresAt).toUpperCase()}`}</span></span>
                  <span className="flex items-center gap-2">
                    {live ? <Pill kind="given" label="Active" /> : <Pill kind="withdrawn" label={p.revokedAt ? "Revoked" : "Expired"} />}
                    {live && perm.write && <button className="btn btn-ghost btn-sm" onClick={async () => { await actions.revokePack(p.id); toast("Link revoked"); }}><X className="h-3.5 w-3.5" />Revoke</button>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
