import { useState } from "react";
import { Check, Printer, Upload, X } from "lucide-react";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { clsLabel } from "@/lib/derive";
import type { Student } from "@/lib/types";

const MAX = 10 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** Printable blank consent form (English + Hindi). */
export function printBlankForm(school: string, s?: Student) {
  const w = window.open("", "_blank");
  if (!w) { toast("Allow pop-ups to print the form."); return; }
  const line = (v?: string) => v ? `<b>${v.replace(/</g, "&lt;")}</b>` : "<span class='l'></span>";
  const box = (en: string, hi: string, req = false) => `<div class="row"><span class="box">${req ? "&#10003;" : ""}</span><div>${en}${req ? " (required)" : " (optional)"}<br><span class="hi">${hi}</span></div></div>`;
  w.document.write(`<!doctype html><html><head><title>Consent form · ${school}</title><style>
    body{font-family:Geist,Arial,sans-serif;color:#0F1412;max-width:720px;margin:32px auto;padding:0 24px;font-size:14px;line-height:1.5}
    h1{font-size:20px;margin:0 0 4px} .m{font-family:monospace;font-size:11px;color:#727B76;letter-spacing:.06em}
    .hi{font-family:"Noto Sans Devanagari",sans-serif;color:#3A423E} .row{display:flex;gap:12px;margin:10px 0}
    .box{width:18px;height:18px;border:1.5px solid #0F1412;flex:none;text-align:center;line-height:18px} .l{display:inline-block;min-width:220px;border-bottom:1px solid #0F1412}
    section{border:1px solid #E7EAE8;border-radius:12px;padding:16px;margin:16px 0}
  </style></head><body>
    <div class="m">PARENT CONSENT FORM · DPDP ACT 2023</div><h1>${school}</h1>
    <p>Consent for your child's data / <span class="hi">आपके बच्चे के डेटा के लिए सहमति</span></p>
    <section><p>Student / <span class="hi">छात्र</span>: ${line(s?.name)} &nbsp; Class / <span class="hi">कक्षा</span>: ${line(s ? clsLabel(s) : undefined)}</p>
    <p>Parent / <span class="hi">अभिभावक</span>: ${line(s?.parent)} &nbsp; Mobile / <span class="hi">मोबाइल</span>: ${line()}</p></section>
    <section><p>The school keeps name, class, photo, address, parent contact, marks, attendance and medical notes for teaching, report cards, transport and emergencies.<br><span class="hi">स्कूल पढ़ाई, रिपोर्ट कार्ड, बस और आपात स्थिति के लिए नाम, कक्षा, फ़ोटो, पता, अभिभावक संपर्क, अंक, उपस्थिति और स्वास्थ्य जानकारी रखता है।</span></p>
    ${box("Education and school records", "शिक्षा और स्कूल रिकॉर्ड", true)}
    ${box("Photos on school website and social media", "स्कूल वेबसाइट और सोशल मीडिया पर फ़ोटो")}
    ${box("Event photos in the school newsletter", "स्कूल न्यूज़लेटर में कार्यक्रम की फ़ोटो")}</section>
    <p>You can change or withdraw optional consent at any time, free. / <span class="hi">आप वैकल्पिक सहमति कभी भी मुफ़्त में बदल या वापस ले सकते हैं।</span></p>
    <section><p>Parent signature / <span class="hi">अभिभावक के हस्ताक्षर</span>: ${line()} &nbsp; Date / <span class="hi">तारीख</span>: ${line()}</p>
    <p>Witnessed by (staff) / <span class="hi">गवाह (स्टाफ़)</span>: ${line()}</p></section>
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

/** "Record paper consent" for a pending student without WhatsApp. */
export default function PaperConsent({ s, onClose }: { s: Student; onClose: () => void }) {
  const db = useDB()!;
  const [file, setFile] = useState<File | null>(null);
  const [web, setWeb] = useState(false);
  const [news, setNews] = useState(false);
  const [witness, setWitness] = useState(db.me.name === "Principal's office" ? "" : db.me.name);
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) { toast("Upload a photo (JPG, PNG, WEBP, HEIC) or a PDF."); return; }
    if (f.size > MAX) { toast("That file is over 10 MB. Take a smaller photo or compress the PDF."); return; }
    setFile(f);
  };
  const save = async () => {
    if (!file) { toast("Upload the scan of the signed form."); return; }
    setBusy(true);
    try {
      const hash = await actions.recordPaper({ sid: s.id, file, web, newsletter: news, witness, date });
      toast(`Paper consent recorded · SHA-256 ${hash.slice(0, 10)}…`);
      onClose();
    } catch { /* toast shown */ } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-[18px] shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">Record paper consent · {s.name} <span className="font-normal text-muted-2">{clsLabel(s)}</span></h2>
        <div className="flex gap-2"><button className="btn btn-sm" onClick={() => printBlankForm(db.school.name, s)}><Printer className="h-3.5 w-3.5" />Print blank form</button><button className="btn btn-ghost btn-sm" onClick={onClose}><X className="h-3.5 w-3.5" />Close</button></div></div>
      <p className="text-[12.5px] text-muted-2">For parents without WhatsApp. The scan is stored privately for your school's staff, and its SHA-256 fingerprint goes into the ledger so it can be proven unchanged later.</p>
      <label className="flex cursor-pointer flex-col items-start gap-1.5 rounded-[10px] border border-dashed border-line-2 bg-canvas px-4 py-3 text-[13px]">
        <span className="btn btn-sm"><Upload className="h-3.5 w-3.5" />{file ? "Choose another file" : "Upload photo or PDF"}</span>
        <span className="text-muted-2">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "Images or PDF, up to 10 MB"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" hidden aria-label="Signed form" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex items-center gap-2 rounded-[10px] border border-line px-3 py-2.5 text-[13px]"><input type="checkbox" checked disabled className="accent-green" />School records</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-line px-3 py-2.5 text-[13px]"><input type="checkbox" checked={web} onChange={() => setWeb(!web)} className="accent-green" />Website photos</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-line px-3 py-2.5 text-[13px]"><input type="checkbox" checked={news} onChange={() => setNews(!news)} className="accent-green" />Newsletter photos</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Witnessed by (staff)<input className="field min-h-10 text-sm" list="staff-names" value={witness} onChange={(e) => setWitness(e.target.value)} placeholder="Mr. Arun Mehta" /><datalist id="staff-names">{db.staff.map((m) => <option key={m.userId} value={m.name || m.email} />)}</datalist></label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Date signed<input type="date" max={today()} className="field min-h-10 text-sm" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <button className="btn btn-primary w-fit" disabled={busy} onClick={save}><Check className="h-4 w-4" />{busy ? "Saving…" : "Record consent"}</button>
    </div>
  );
}
