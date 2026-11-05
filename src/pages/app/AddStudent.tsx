import { useState, type FormEvent } from "react";
import { UserPlus, X } from "lucide-react";
import { toast } from "@/components/toast";
import { actions } from "@/lib/store";
import { CLASS_ORDER } from "@/lib/derive";
import { LANGS, LANG_CODES } from "@/lib/i18n";
import type { DB, Lang } from "@/lib/types";

// One student at a time, for when a new admission joins mid-year. Bulk lists go through
// "Import from Excel".

const clsName = (c: string) => (/^\d+$/.test(c) ? `Class ${c}` : c);
const EMPTY = { name: "", cls: "1", sec: "A", parent: "", phone: "", lang: "en" as Lang };

export default function AddStudent({ db, onClose }: { db: DB; onClose: () => void }) {
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: Pick<FormEvent, "preventDefault">, again: boolean) => {
    e.preventDefault();
    const row = { name: f.name.trim().replace(/\s+/g, " ").slice(0, 100), cls: f.cls, sec: f.sec.trim().toUpperCase().slice(0, 4) || "A", parent: f.parent.trim().replace(/\s+/g, " ").slice(0, 100), phone: f.phone.replace(/\D/g, "").slice(-10), lang: f.lang };
    if (!row.name) { setErr("Enter the student's name."); return; }
    if (!row.parent) { setErr("Enter the parent's name, so the consent message can greet them."); return; }
    if (!/^[6-9]\d{9}$/.test(row.phone)) { setErr("Enter the parent's 10-digit mobile number. This is where the consent link and code go."); return; }
    const dupe = Object.values(db.students).find((s) => s.name.toLowerCase() === row.name.toLowerCase() && s.cls === row.cls && s.sec === row.sec);
    if (dupe) { setErr(`${dupe.name} is already in ${clsName(dupe.cls)}-${dupe.sec}.`); return; }
    setErr(""); setBusy(true);
    try {
      await actions.importStudents([row]);
      toast(`${row.name} added to ${clsName(row.cls)}-${row.sec}`);
      if (again) setF({ ...EMPTY, cls: row.cls, sec: row.sec, lang: row.lang }); else onClose();
    } finally { setBusy(false); }
  };

  const field = "field min-h-10 w-full text-sm";
  return (
    <form onSubmit={(e) => submit(e, false)} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-[18px] shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Add a student</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}><X className="h-3.5 w-3.5" />Close</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_0.7fr]">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Student's name
          <input id="as-name" className={field} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Rohan Mehta" autoFocus autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Class
          <select id="as-cls" className={field} value={f.cls} onChange={(e) => set("cls", e.target.value)}>
            {CLASS_ORDER.map((c) => <option key={c} value={c}>{clsName(c)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Section
          <input id="as-sec" className={`${field} uppercase`} value={f.sec} onChange={(e) => set("sec", e.target.value)} maxLength={4} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.3fr_1fr]">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Parent's name
          <input id="as-parent" className={field} value={f.parent} onChange={(e) => set("parent", e.target.value)} placeholder="Seema Mehta" autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Parent's mobile (WhatsApp)
          <span className="flex items-center gap-2">
            <span className="text-sm text-muted-2">+91</span>
            <input id="as-phone" className={`${field} font-mono`} value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="numeric" placeholder="98765 43210" autoComplete="off" />
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Parent's language
          <select id="as-lang" className={field} value={f.lang} onChange={(e) => set("lang", e.target.value as Lang)}>
            {LANG_CODES.map((l) => <option key={l} value={l}>{LANGS[l].name}{l !== "en" ? ` · ${LANGS[l].native}` : ""}</option>)}
          </select>
        </label>
      </div>

      {err && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}><UserPlus className="h-4 w-4" />{busy ? "Adding…" : "Add student"}</button>
        <button type="button" className="btn" disabled={busy} onClick={(e) => submit(e, true)}>Add and add another</button>
        <span className="text-[12.5px] text-muted-2">The student starts as pending. Send the consent link from Remind pending.</span>
      </div>
    </form>
  );
}
