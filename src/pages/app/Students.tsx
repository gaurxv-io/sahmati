import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Check, Eye, FileSignature, FileText, MessageCircle, RefreshCw, Search, Upload, UserPlus, X } from "lucide-react";
import { Pill } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { can, clsLabel, maskPhone, olderNotice, shortDate, sortedStudents, waHref } from "@/lib/derive";
import type { ConsentStatus, Lang } from "@/lib/types";
import { PageHead } from "./Layout";
import { LANGS, isLang } from "@/lib/i18n";
import PaperConsent from "./PaperConsent";
import AddStudent from "./AddStudent";
import { ClassSelect, ClassTree, groupStudents, inScope, scopeName, type Scope } from "./ClassTree";

type Filter = "all" | ConsentStatus;
type SP = { status?: string; remind?: string; import?: string; drive?: string; add?: string; cls?: string; sec?: string };
type Drive = "year" | "admissions" | "notice";

export default function Students() {
  const db = useDB()!;
  const params = useSearch({ from: "/app/students" }) as SP;
  const navigate = useNavigate({ from: "/app/students" });
  const setParams = (p: SP) => navigate({ search: p, replace: true });
  const filter = (params.status as Filter) || "all";
  const drawer = params.remind ? "remind" : params.import ? "import" : params.drive ? "drive" : params.add ? "add" : null;
  const perm = can(db);
  const [paperSid, setPaperSid] = useState<string | null>(null);
  const [drive, setDrive] = useState<Drive>("year");
  const [since, setSince] = useState("2026-10-01");
  const [q, setQ] = useState("");
  const [csv, setCsv] = useState("");

  const setParam = (k: keyof SP, v: string | null) => { const p: SP = { ...params }; if (v) p[k] = v; else delete p[k]; setParams(p); };
  const openDrawer = (d: "remind" | "import" | "drive" | "add" | null) => { const p: SP = { ...params }; delete p.remind; delete p.import; delete p.drive; delete p.add; if (d) p[d] = "1"; setParams(p); };

  const scope: Scope = params.cls ? { cls: params.cls, ...(params.sec ? { sec: params.sec } : {}) } : {};
  const pickScope = (s: Scope) => { const p: SP = { ...params }; delete p.cls; delete p.sec; if (s.cls) p.cls = s.cls; if (s.sec) p.sec = s.sec; setParams(p); };
  const everyone = useMemo(() => sortedStudents(db), [db]);
  const groups = useMemo(() => groupStudents(everyone), [everyone]);
  const scoped = useMemo(() => everyone.filter((s) => inScope(s, scope)), [everyone, scope.cls, scope.sec]);
  const list = useMemo(() => scoped.filter((s) => (filter === "all" || s.status === filter) && (!q || `${s.name} ${s.parent}`.toLowerCase().includes(q.toLowerCase()))), [scoped, filter, q]);
  const pending = scoped.filter((s) => s.status === "pending" || s.status === "renewal");
  const count = (k: ConsentStatus) => scoped.filter((s) => s.status === k).length;
  const scopeDone = scoped.filter((s) => s.status !== "pending").length;
  const scopePct = scoped.length ? Math.round((scopeDone / scoped.length) * 100) : 0;
  const where = scope.cls ? scopeName(scope) : undefined;
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
      return [{ name: c[0], cls: c[1], sec: c[2] || "A", parent: c[3], phone: c[4], lang: (isLang((c[5] || "en").toLowerCase()) ? (c[5] || "en").toLowerCase() : "en") as Lang }];
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
          <button className="btn" onClick={() => openDrawer(drawer === "add" ? null : "add")}><UserPlus className="h-4 w-4" />Add student</button>
          <button className="btn" onClick={() => openDrawer(drawer === "import" ? null : "import")}><Upload className="h-4 w-4" />Import from Excel</button>
          <button className="btn" onClick={() => openDrawer(drawer === "drive" ? null : "drive")}><RefreshCw className="h-4 w-4" />New consent drive</button>
          <button className="btn btn-primary" onClick={() => openDrawer(drawer === "remind" ? null : "remind")}><MessageCircle className="h-4 w-4" />Remind pending</button>
        </>}
      </PageHead>

      {drawer === "add" && <AddStudent db={db} onClose={() => openDrawer(null)} />}

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
            <h2 className="text-base font-semibold">Remind {pending.length} parents{where ? ` in ${where}` : ""}{count("renewal") > 0 && <span className="font-normal text-muted-2"> · {count("renewal")} renewals</span>}</h2>
            <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => openDrawer(null)}><X className="h-3.5 w-3.5" />Close</button><button className="btn btn-primary btn-sm" onClick={async () => { await actions.remindPending(scope.cls ? scoped.map((s) => s.id) : undefined, where); openDrawer(null); toast(`Reminder logged for ${pending.length} parents${where ? ` in ${where}` : ""}`); }}><Check className="h-3.5 w-3.5" />Mark all reminded</button></div>
          </div>
          <p className="px-[18px] py-3 text-[12.5px] text-muted-2">Each button opens WhatsApp with a ready message in the parent's language and their personal consent link. With the WhatsApp Business API connected, this becomes one click for the whole list.</p>
          <div className="max-h-[300px] overflow-auto border-t border-line">
            {pending.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-[18px] py-2.5 text-[13px] last:border-b-0">
                <span><b className="font-semibold">{s.parent}</b> <span className="text-muted-2">for {s.name} · {clsLabel(s)}</span><br /><span className="font-mono text-[11.5px] text-muted-2">{maskPhone(s.phone)} · {(LANGS[s.lang]?.name ?? "English").toUpperCase()}</span></span>
                <a className="btn btn-sm" target="_blank" rel="noopener" href={waHref(db, s, true)}><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
              </div>
            ))}
            {!pending.length && <p className="px-[18px] py-6 text-center text-muted-2">Every parent{where ? ` in ${where}` : ""} has responded.</p>}
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

      {paperSid && db.students[paperSid] && <PaperConsent s={db.students[paperSid]} onClose={() => setPaperSid(null)} />}

      <div className="grid items-start gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="panel hidden max-h-[calc(100vh-96px)] overflow-y-auto p-2 lg:sticky lg:top-[76px] lg:block">
        <ClassTree groups={groups} total={everyone.length} scope={scope} onPick={pickScope} />
      </aside>
      <div className="flex min-w-0 flex-col gap-3">
      <div className="lg:hidden"><ClassSelect groups={groups} total={everyone.length} scope={scope} onPick={pickScope} /></div>
      <div className="panel">
        {scope.cls && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-[18px] py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{scopeName(scope)}</h2>
              <span className="text-[13px] text-muted-2">{scoped.length} students · {scopeDone} responded · {pending.length} pending</span>
            </div>
            <div className="flex min-w-[160px] flex-1 items-center gap-3 sm:max-w-[260px]">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track"><span className={`block h-full rounded-full ${scopePct >= 80 ? "bg-brand-hover" : "bg-amber"}`} style={{ width: `${scopePct}%` }} /></span>
              <b className="font-mono text-[12.5px] tabular-nums">{scopePct}%</b>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {perm.write && pending.length > 0 && <button className="btn btn-primary btn-sm" onClick={() => openDrawer("remind")}><MessageCircle className="h-3.5 w-3.5" />Remind {pending.length} pending</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => pickScope({})}><X className="h-3.5 w-3.5" />All students</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-3">
          <div role="group" aria-label="Status" className="inline-flex max-w-full overflow-x-auto gap-[3px] rounded-lg border border-line bg-canvas p-[3px]">
            {seg("all", "All", scoped.length)}{seg("given", "Given", count("given"))}{seg("pending", "Pending", count("pending"))}{seg("withdrawn", "Withdrawn", count("withdrawn"))}{count("renewal") > 0 && seg("renewal", "Renewal", count("renewal"))}
          </div>
          <div className="relative w-full sm:ml-auto sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-3" />
            <input id="q" type="search" placeholder={scope.cls ? `Search in ${scopeName(scope)}` : "Search student or parent"} className="field w-full pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
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
                    <td className="td"><span className="inline-flex flex-wrap items-center gap-1"><Pill kind={s.status} />{s.paper && (s.paperFile && perm.write ? <button className="tag" title="View the signed paper form" onClick={async () => window.open(await actions.paperUrl(s.paperFile!), "_blank")}>PAPER</button> : <span className="tag">PAPER</span>)}</span></td>
                    <td className="td"><span className="inline-flex gap-1"><span className={`tag ${on ? "tag-on" : ""}`} title="School records">REC</span><span className={`tag ${on && s.choices.web ? "tag-on" : ""}`} title="Photos on website and social media">WEB</span><span className={`tag ${on && s.choices.newsletter ? "tag-on" : ""}`} title="Newsletter photos">NEWS</span></span></td>
                    <td className="td whitespace-nowrap text-xs text-muted-2">{s.consentAt ? `Consented ${shortDate(s.consentAt)}` : s.sentAt ? `Link sent ${shortDate(s.sentAt)}` : "Not contacted"}</td>
                    <td className="td"><div className="flex justify-end gap-1.5">
                      {(s.status === "pending" || s.status === "renewal") && perm.write && <a className="btn btn-sm" target="_blank" rel="noopener" href={waHref(db, s)} onClick={() => actions.markSent(s.id)}><MessageCircle className="h-3.5 w-3.5" />Send</a>}
                      {(s.status === "pending" || s.status === "renewal") && perm.write && <button className="btn btn-ghost btn-sm" onClick={() => { setPaperSid(s.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><FileSignature className="h-3.5 w-3.5" />Paper consent</button>}
                      <Link className="btn btn-ghost btn-sm" to="/app/students/$sid/pack" params={{ sid: s.id }} title="Prepare data pack"><FileText className="h-3.5 w-3.5" />Data pack</Link>
                      <Link className="btn btn-ghost btn-sm" to="/c/$sid" params={{ sid: s.id }} title="Open what the parent sees"><Eye className="h-3.5 w-3.5" />Parent view</Link>
                    </div></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={6} className="td py-9 text-center text-muted-2">No students in {scopeName(scope)} match these filters.{scope.cls && <> <button className="font-semibold text-green hover:underline" onClick={() => pickScope({})}>Search all students</button></>}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      </div>
    </>
  );
}
