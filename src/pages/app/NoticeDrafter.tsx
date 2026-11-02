import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X } from "lucide-react";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { LANGS, fontStyle, loadFont, type LangCode } from "@/lib/i18n";
import { NOTICE_SECTIONS, type NoticeContent, type NoticeSection } from "@/lib/types";
import { draftNotice } from "@/lib/notice.functions";

const nextVersion = (v: string) => "v" + (parseInt(v.replace(/\D/g, "") || "0", 10) + 1);

/** Settings → Privacy notice: AI draft, side-by-side review, then publish as the next version. */
export default function NoticeDrafter({ onPublished }: { onPublished: () => void }) {
  const db = useDB()!;
  const run = useServerFn(draftNotice);
  const offered = (db.school.languages ?? ["en", "hi"]) as LangCode[];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    collect: "Student name, class, photo, date of birth, address, parent names and mobile numbers, marks, attendance, and medical notes parents share.",
    purposes: "Teaching and assessment, report cards, school transport, fee records, and contacting parents in an emergency. Photos on the website and newsletter only with separate consent.",
    retention: "While the child studies here and for 3 years after they leave, then deleted.",
    contact: db.school.dpo,
    languages: offered,
  });
  const [draft, setDraft] = useState<NoticeContent | null>(null);
  const [right, setRight] = useState<LangCode>(offered.find((l) => l !== "en") ?? "en");
  const vendors = db.vendors.map((v) => `${v.name} (${v.role}): ${v.data.join(", ")}`).join("; ");

  const generate = async () => {
    setBusy(true);
    try {
      const r = await run({ data: { school: db.school.name, city: db.school.city, vendors, ...form } });
      if (!r.ok) { toast(r.error); return; }
      setDraft(r.content as NoticeContent);
      const firstOther = (Object.keys(r.content) as LangCode[]).find((l) => l !== "en");
      if (firstOther) { setRight(firstOther); loadFont(firstOther); }
    } catch { toast("Couldn't draft the notice right now. Try again."); } finally { setBusy(false); }
  };
  const edit = (l: LangCode, k: NoticeSection, v: string) => setDraft((d) => ({ ...d, [l]: { ...(d?.[l] as Record<NoticeSection, string>), [k]: v } }));
  const publish = async () => {
    if (!draft) return;
    const v = await actions.publishNoticeContent(draft);
    toast(`Privacy notice ${v} published`);
    setDraft(null); setOpen(false); onPublished();
  };

  if (!open) return <button className="btn btn-primary w-fit" onClick={() => setOpen(true)}><Sparkles className="h-4 w-4" />Draft notice with AI</button>;

  const langs = draft ? (Object.keys(draft) as LangCode[]) : [];
  const col = (l: LangCode) => (
    <div className="flex min-w-0 flex-col gap-3" lang={l} style={fontStyle(l)}>
      <span className="eyebrow">{LANGS[l].name}</span>
      {NOTICE_SECTIONS.map(([k, label]) => (
        <label key={k} className="flex flex-col gap-1 text-[12.5px] font-medium text-muted">{label}
          <textarea className="field min-h-20 py-2 text-[13.5px] font-normal text-ink" value={draft?.[l]?.[k] ?? ""} onChange={(e) => edit(l, k, e.target.value)} />
        </label>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-canvas p-3.5">
      <div className="flex items-center justify-between"><b className="text-sm font-semibold">Draft notice with AI</b><button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setDraft(null); }}><X className="h-3.5 w-3.5" />Close</button></div>
      {!draft ? (
        <>
          {([["collect", "What data the school collects"], ["purposes", "Purposes"], ["retention", "Retention period"], ["contact", "Data protection contact"]] as const).map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1.5 text-[13px] font-medium">{l}
              <textarea className="field min-h-16 py-2 text-sm font-normal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          <div className="flex flex-col gap-1.5 text-[13px] font-medium">Vendors (from your vendor register)
            <p className="rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] font-normal text-muted">{vendors || "No vendors listed yet."}</p>
          </div>
          <div className="flex flex-col gap-1.5 text-[13px] font-medium">Languages
            <div className="flex flex-wrap gap-1.5">
              {offered.map((l) => (
                <label key={l} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12.5px] font-normal ${form.languages.includes(l) ? "border-green-line bg-green-soft" : "border-line bg-white"}`}>
                  <input type="checkbox" className="accent-green" disabled={l === "en"} checked={form.languages.includes(l)} onChange={() => setForm({ ...form, languages: form.languages.includes(l) ? form.languages.filter((x) => x !== l) : [...form.languages, l] })} />{LANGS[l].name}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary w-fit" disabled={busy} onClick={generate}><Sparkles className="h-4 w-4" />{busy ? "Drafting… about 30 seconds" : "Draft notice"}</button>
        </>
      ) : (
        <>
          <p className="rounded-lg border border-amber/40 bg-amber-soft px-3 py-2 text-[12.5px] font-medium text-amber-ink">AI draft. Review before publishing; this is not legal advice.</p>
          {langs.length > 1 && (
            <label className="flex w-fit items-center gap-2 text-[13px] font-medium">Compare with
              <select className="field" value={right} onChange={(e) => { setRight(e.target.value as LangCode); loadFont(e.target.value as LangCode); }}>{langs.filter((l) => l !== "en").map((l) => <option key={l} value={l}>{LANGS[l].name}</option>)}</select>
            </label>
          )}
          <div className={`grid gap-4 ${langs.length > 1 ? "lg:grid-cols-2" : ""}`}>{col("en")}{langs.length > 1 && col(right)}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={publish}>Publish as {nextVersion(db.school.noticeVersion)}</button>
            <button className="btn" disabled={busy} onClick={generate}>{busy ? "Drafting…" : "Draft again"}</button>
          </div>
        </>
      )}
    </div>
  );
}
