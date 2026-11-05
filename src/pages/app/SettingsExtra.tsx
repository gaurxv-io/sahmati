import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Users } from "lucide-react";
import { toast } from "@/components/toast";
import { actions, useDB, useStore } from "@/lib/store";
import { can, digest } from "@/lib/derive";
import { LANGS, LANG_CODES, type LangCode } from "@/lib/i18n";

/** Settings → which languages parents can choose. */
export function LanguagesPanel() {
  const db = useDB()!;
  const admin = can(db).admin;
  const cur = (db.school.languages ?? ["en", "hi"]) as LangCode[];
  const toggle = async (l: LangCode) => {
    if (l === "en") return;
    const next = cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l];
    await actions.setLanguages(next);
    toast("Parent languages saved");
  };
  return (
    <div className="panel flex flex-col gap-3 p-[18px]">
      <h2 className="text-base font-semibold">Languages for parents</h2>
      <p className="text-[13px] text-muted">Parents choose from these on their consent link. WhatsApp messages go in each parent's own language.</p>
      <div className="flex flex-wrap gap-1.5">
        {LANG_CODES.map((l) => (
          <label key={l} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] ${cur.includes(l) ? "border-green-line bg-green-soft" : "border-line bg-white"} ${admin && l !== "en" ? "cursor-pointer" : ""}`}>
            <input type="checkbox" className="accent-green" checked={cur.includes(l)} disabled={!admin || l === "en"} onChange={() => toggle(l)} />{LANGS[l].name}
          </label>
        ))}
      </div>
      <p className="font-mono text-[11px] text-muted-2">Translations should be reviewed by a native speaker before use with parents.</p>
    </div>
  );
}

/** Settings → Weekly summary preview, WhatsApp share and the Monday email setting. */
export function DigestPanel() {
  const db = useDB()!;
  const { user, mode } = useStore();
  const d = digest(db);
  const admin = can(db).admin;
  const [to, setTo] = useState(db.school.digestEmailTo || user?.email || "");
  const on = !!db.school.digestEmail;
  return (
    <div className="panel flex flex-col gap-3 p-[18px]">
      <h2 className="text-base font-semibold">Weekly summary</h2>
      <p className="text-[13px] text-muted">What the principal gets every Monday.</p>
      <pre className="whitespace-pre-wrap rounded-[10px] border border-line bg-canvas px-3.5 py-3 font-mono text-[12px] leading-relaxed text-ink-2">{d.text}</pre>
      <a className="btn w-fit" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(d.text)}`}><MessageCircle className="h-4 w-4" />Send to my WhatsApp now</a>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <label className="flex items-center gap-2.5 text-[13px] font-medium">
          <input type="checkbox" className="h-4 w-4 accent-green" checked={on} disabled={!admin} onChange={async () => { await actions.setDigest(!on, to); toast(on ? "Weekly email switched off" : "Weekly email switched on"); }} />
          <Mail className="h-4 w-4 text-muted-2" />Email me every Monday
        </label>
        <input type="email" aria-label="Summary email" className="field min-h-9 text-sm" value={to} disabled={!admin || on} onChange={(e) => setTo(e.target.value)} placeholder="principal@school.in" />
        <p className="text-[12px] text-muted-2">{mode === "demo" ? "Demo school: the setting is saved but no email is sent." : "Saved now. Emails start once Sahmati's sending domain is verified; until then nothing is sent."}</p>
      </div>
    </div>
  );
}

/** Settings → School group (chain). */
export function GroupPanel() {
  const db = useDB()!;
  const admin = can(db).admin;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return (
    <div className="panel flex flex-col gap-3 p-[18px]">
      <h2 className="text-base font-semibold">School group</h2>
      {db.school.groupId ? (
        <>
          <p className="text-[13px] text-muted">This school belongs to a group. Group admins see every school's numbers side by side.</p>
          <Link to="/app/group" className="btn w-fit"><Users className="h-4 w-4" />Open group view</Link>
        </>
      ) : db.school.isDemo || !admin ? (
        <p className="text-[13px] text-muted-2">Not part of a school group.</p>
      ) : (
        <>
          <p className="text-[13px] text-muted">Run several schools? Create a group to become its Group admin, then share the group code with the other principals.</p>
          <div className="flex gap-2"><input className="field min-h-9 min-w-0 flex-1 text-sm" placeholder="Group name, e.g. Green Valley Trust" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn" disabled={!name.trim()} onClick={async () => { await actions.createGroup(name); toast("Group created"); }}>Create</button></div>
          <div className="flex gap-2"><input className="field min-h-9 min-w-0 flex-1 font-mono text-sm" placeholder="Group code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn" disabled={!code.trim()} onClick={async () => { await actions.joinGroup(code); toast("Joined the group"); }}>Join</button></div>
        </>
      )}
    </div>
  );
}

/** Overview → "This week" card. */
export function ThisWeek() {
  const db = useDB()!;
  const d = digest(db);
  return (
    <div className="panel p-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="eyebrow">This week</span><a className="text-[13px] font-semibold" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(d.text)}`}>Send to my WhatsApp</a></div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        {d.lines.map((l) => <div key={l.k} className="min-w-0"><div className="text-[11.5px] text-muted-2">{l.k}</div><div className="font-semibold tabular-nums">{l.v}</div></div>)}
      </div>
      <p className="mt-3 border-t border-line pt-3 text-[13px]"><b className="font-semibold">Next:</b> {d.next}</p>
    </div>
  );
}
