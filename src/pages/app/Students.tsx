import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Check, Eye, FileText, MessageCircle, RefreshCw, Search, Upload, X } from "lucide-react";
import { Pill } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { BANDS, band, can, clsLabel, maskPhone, olderNotice, shortDate, sortedStudents, stats, waHref } from "@/lib/derive";
import type { ConsentStatus, Lang } from "@/lib/types";
import { PageHead } from "./Layout";

type Filter = "all" | ConsentStatus;
type SP = { status?: string; remind?: string; import?: string; drive?: string };
type Drive = "year" | "admissions" | "notice";

export default function Students() {
  const db = useDB()!;
  const st = stats(db);
  const params = useSearch({ from: "/app/students" }) as SP;
  const navigate = useNavigate({ from: "/app/students" });
  const setParams = (p: SP) => navigate({ search: p, replace: true });
  const filter = (params.status as Filter) || "all";
  const drawer = params.remind ? "remind" : params.import ? "import" : params.drive ? "drive" : null;
  const perm = can(db);
  const [drive, setDrive] = useState<Drive>("year");
  const [since, setSince] = useState("2026-10-01");
  const [bandSel, setBand] = useState("all");
  const [q, setQ] = useState("");
  const [csv, setCsv] = useState("");

  const setParam = (k: keyof SP, v: string | null) => { const p: SP = { ...params }; if (v) p[k] = v; else delete p[k]; setParams(p); };
  const openDrawer = (d: "remind" | "import" | "drive" | null) => { const p: SP = { ...params }; delete p.remind; delete p.import; delete p.drive; if (d) p[d] = "1"; setParams(p); };

  const list = useMemo(() => sortedStudents(db).filter((s) => (filter === "all" || s.status === filter) && (bandSel === "all" || band(s.cls) === bandSel) && (!q || `${s.name} ${s.parent}`.toLowerCase().includes(q.toLowerCase()))), [db, filter, bandSel, q]);
  const pending = sortedStudents(db).filter((s) => s.status === "pending" || s.status === "renewal");
  const all = Object.values(db.students);
  const sinceMs = Date.parse(since + "T00:00:00+05:30");
  const driveCount = drive === "year" ? all.length : drive === "admissions" ? all.filter((s) => s.createdAt && Date.parse(s.createdAt) >= sinceMs).length : olderNotice(db).length;
  const startDrive = async () => {
    const n = await actions.startRenewal(drive, drive === "admissions" ? new Date(sinceMs).toISOString() : undefined);
    toast(`Renewal drive started · ${n} parents to ask`);
    openDrawer("remind");
  };

  const importRows = async () => {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines[0] && /name/i.test(lines[0])) lines.shift();
    let skipped = 0;
    const rows = lines.flatMap((l) => {
      const c = l.split(",").map((x) => x.trim());
      if (c.length < 5 || !/^\d{10}$/.test(c[4])) { skipped++; return []; }
      return [{ name: c[0], cls: c[1], sec: c[2] || "A", parent: c[3], phone: c[4], lang: ((c[5] || "en").toLowerCase() === "hi" ? "hi" : "en") as Lang }];
    });
    if (!rows.length) { toast("No valid rows. Check the column order and 10-digit mobile numbers."); return; }
    await actions.importStudents(rows);
    setCsv(""); openDrawer(null);
    toast(`${rows.length} students added${skipped ? ` · ${skipped} rows skipped` : ""}`);
  };

  const seg = (k: Filter, label: string, n: number) => (
    <button key={k} aria-pressed={filter === k} onClick={() => setParam("status", k === "all" ? null : k)} className={`flex min-h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] ${filter === k ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(15,20,18,0.08)]" : "text-muted"}`}>
      {label} <span className="font-mono text-[11px] text-muted-2">{n}</span>
    </button>
  );

  return (
    <>
      <PageHead n="02" label="Students" title="Consent register" desc="Every student, the parent we reach, and what they agreed to. Optional consents are tracked separately from school records.">
        {perm.write && <>
          <button className="btn" onClick={() => openDrawer(drawer === "import" ? null : "import")}><Upload className="h-4 w-4" />Import from Excel</button>
          <button className="btn" onClick={() => openDrawer(drawer === "drive" ? null : "drive")}><RefreshCw className="h-4 w-4" />New consent drive</button>
          <button className="btn btn-primary" onClick={() => openDrawer(drawer === "remind" ? null : "remind")}><MessageCircle className="h-4 w-4" />Remind pending</button>
        </>}
      </PageHead>

      {drawer === "drive" && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-[18px] shadow-card">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">New consent drive</h2><button className="btn btn-ghost btn-sm" onClick={() => openDrawer(null)}><X className="h-3.5 w-3.5" />Close</button></div>
          <p className="text-[12.5px] text-muted-2">Ask parents to confirm their consent again. Their earlier consents stay in the ledger; students are marked Renewal pending until the parent answers.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {([["year", "New academic year", "All students"], ["admissions", "New admissions only", "Students added since a date"], ["notice", "Notice changed", `Consented to an older notice than ${db.school.noticeVersion}`]] as const).map(([k, title, sub]) => (
              <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-[10px] border px-4 py-3 text-[13px] ${drive === k ? "border-green-line bg-green-soft" : "border-line bg-white"}`}>
                <input type="radio" name="drive" checked={drive === k} onChange={() => setDrive(k)} className="mt-0.5 accent-green" />
                <span><b className="font-semibold">{title}</b><br /><span className="text-muted-2">{sub}</span></span>
              </label>
            ))}
          </div>
          {drive === "admissions" && <label className="flex w-fit items-center gap-2 text-[13px] font-medium">Added since<input type="date" className="field" value={since} onChange={(e) => setSince(e.target.value)} /></label>}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm"><b className="font-semibold tabular-nums">{driveCount}</b> parents will be asked</span>
            <button className="btn btn-primary btn-sm" disabled={!driveCount} onClick={startDrive}><Check className="h-3.5 w-3.5" />Start drive and open reminders</button>
          </div>
        </div>
      )}

      {drawer === "remind" && (
        <div className="rounded-xl border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] pt-4">
            <h2 className="text-base font-semibold">Remind {pending.length} parents{st.renewal > 0 && <span className="font-normal text-muted-2"> · {st.renewal} renewals</span>}</h2>
            <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => openDrawer(null)}><X className="h-3.5 w-3.5" />Close</button><button className="btn btn-primary btn-sm" onClick={async () => { await actions.remindPending(); openDrawer(null); toast(`Reminder logged for ${pending.length} parents`); }}><Check className="h-3.5 w-3.5" />Mark all reminded</button></div>
          </div>
          <p className="px-[18px] py-3 text-[12.5px] text-muted-2">Each button opens WhatsApp with a ready message in the parent's language and their personal consent link. With the WhatsApp Business API connected, this becomes one click for the whole list.</p>
          <div className="max-h-[300px] overflow-auto border-t border-line">
            {pending.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-[18px] py-2.5 text-[13px] last:border-b-0">
                <span><b className="font-semibold">{s.parent}</b> <span className="text-muted-2">for {s.name} · {clsLabel(s)}</span><br /><span className="font-mono text-[11.5px] text-muted-2">{maskPhone(s.phone)} · {s.lang === "hi" ? "HINDI" : "ENGLISH"}</span></span>
                <a className="btn btn-sm" target="_blank" rel="noopener" href={waHref(db, s, true)}><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
              </div>
            ))}
            {!pending.length && <p className="px-[18px] py-6 text-center text-muted-2">Every parent has responded.</p>}
          </div>
        </div>
      )}

      {drawer === "import" && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-[18px] shadow-card">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Import students</h2><button className="btn btn-ghost btn-sm" onClick={() => openDrawer(null)}><X className="h-3.5 w-3.5" />Close</button></div>
          <p className="text-[12.5px] text-muted-2">Export your admissions sheet as CSV with columns <span className="font-mono">name, class, section, parent, mobile, language</span>. No ERP needed.</p>
          <textarea id="csv" aria-label="CSV rows" className="field min-h-24 py-2.5 font-mono text-xs" placeholder="Rohan Mehta, 7, A, Seema Mehta, 9000012345, hi" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-sm cursor-pointer"><Upload className="h-3.5 w-3.5" />Choose CSV file<input id="csvfile" type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setCsv); }} /></label>
            <button className="btn btn-primary btn-sm" onClick={importRows}>Add students</button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-3">
          <div role="group" aria-label="Status" className="inline-flex gap-[3px] rounded-lg border border-line bg-canvas p-[3px]">
            {seg("all", "All", st.total)}{seg("given", "Given", st.given)}{seg("pending", "Pending", st.pending)}{seg("withdrawn", "Withdrawn", st.withdrawn)}{st.renewal > 0 && seg("renewal", "Renewal", st.renewal)}
          </div>
          <select id="band" aria-label="Class group" className="field" value={bandSel} onChange={(e) => setBand(e.target.value)}>
            <option value="all">All classes</option>{BANDS.map((b) => <option key={b}>{b}</option>)}
          </select>
          <div className="relative w-full sm:ml-auto sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-3" />
            <input id="q" type="search" placeholder="Search student or parent" className="field w-full pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr><th className="th">Student</th><th className="th">Parent</th><th className="th">Status</th><th className="th">Consents</th><th className="th">Last step</th><th className="th" /></tr></thead>
            <tbody>
              {list.map((s) => {
                const on = s.status !== "pending";
                return (
                  <tr key={s.id} className="hover:bg-[#FBFCFB] [&:last-child>td]:border-b-0">
                    <td className="td"><b className="font-semibold text-ink">{s.name}</b><div className="font-mono text-[11.5px] text-muted-2">{clsLabel(s)}</div></td>
                    <td className="td">{s.parent}<div className="font-mono text-[11.5px] text-muted-2">{maskPhone(s.phone)} · {s.lang.toUpperCase()}</div></td>
                    <td className="td"><Pill kind={s.status} /></td>
                    <td className="td"><span className="inline-flex gap-1"><span className={`tag ${on ? "tag-on" : ""}`} title="School records">REC</span><span className={`tag ${on && s.choices.web ? "tag-on" : ""}`} title="Photos on website and social media">WEB</span><span className={`tag ${on && s.choices.newsletter ? "tag-on" : ""}`} title="Newsletter photos">NEWS</span></span></td>
                    <td className="td whitespace-nowrap text-xs text-muted-2">{s.consentAt ? `Consented ${shortDate(s.consentAt)}` : s.sentAt ? `Link sent ${shortDate(s.sentAt)}` : "Not contacted"}</td>
                    <td className="td"><div className="flex justify-end gap-1.5">
                      {(s.status === "pending" || s.status === "renewal") && perm.write && <a className="btn btn-sm" target="_blank" rel="noopener" href={waHref(db, s)} onClick={() => actions.markSent(s.id)}><MessageCircle className="h-3.5 w-3.5" />Send</a>}
                      <Link className="btn btn-ghost btn-sm" to="/app/students/$sid/pack" params={{ sid: s.id }} title="Prepare data pack"><FileText className="h-3.5 w-3.5" />Data pack</Link>
                      <Link className="btn btn-ghost btn-sm" to="/c/$sid" params={{ sid: s.id }} title="Open what the parent sees"><Eye className="h-3.5 w-3.5" />Parent view</Link>
                    </div></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={6} className="td py-9 text-center text-muted-2">No students match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
