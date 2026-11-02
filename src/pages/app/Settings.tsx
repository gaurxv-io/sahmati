import { useState } from "react";
import { toast } from "@/components/toast";
import { Pill } from "@/components/brand";
import { actions, useDB } from "@/lib/store";
import { PageHead } from "./Layout";

export default function Settings() {
  const db = useDB()!;
  const [form, setForm] = useState({ name: db.school.name, city: db.school.city, dpo: db.school.dpo });
  const save = async () => { await actions.updateSchool(form); toast("School details saved"); };
  return (
    <>
      <PageHead n="06" label="School settings" title="School details and notices" />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="panel flex flex-col gap-3.5 p-[18px]">
          <h2 className="text-base font-semibold">School profile</h2>
          {([["name", "School name"], ["city", "City"], ["dpo", "Data protection contact"]] as const).map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1.5 text-[13px] font-medium">{l}
              <input id={`set-${k}`} className="field min-h-10 text-sm" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">Consent subdomain
            <input id="set-slug" className="field min-h-10 bg-canvas font-mono text-sm text-muted-2" value={`${db.school.slug}.sahmati.in`} readOnly />
          </label>
          <button className="btn btn-primary w-fit" onClick={save}>Save changes</button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="panel flex flex-col gap-3 p-[18px]">
            <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Privacy notice</h2><span className="font-mono text-xs text-muted-2">CURRENT · {db.school.noticeVersion.toUpperCase()}</span></div>
            <p className="text-[13px] text-muted">Parents see this notice in English and Hindi before they consent. Publishing a new version is logged in the consent ledger, and every consent records which version the parent saw.</p>
            <button className="btn w-fit" onClick={async () => { await actions.publishNotice(); toast("New notice version published"); }}>Publish new version</button>
          </div>
          <div className="panel flex flex-col gap-3 p-[18px]">
            <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Breach response plan</h2><span className={`font-mono text-xs ${db.school.breachPlan ? "text-green" : "text-amber-ink"}`}>{db.school.breachPlan ? "FILED" : "NOT FILED"}</span></div>
            <p className="text-[13px] text-muted">Who the school informs, and what it sends, if student data leaks. The Board and affected parents must get a detailed report within 72 hours.</p>
            {!db.school.breachPlan && <button className="btn w-fit" onClick={async () => { await actions.fileBreachPlan(); toast("Breach plan filed"); }}>Mark plan as filed</button>}
          </div>
          <div className="panel flex flex-col gap-2 p-[18px]">
            <h2 className="text-base font-semibold">Audit requests from the website</h2>
            {db.leads.length ? db.leads.slice().reverse().map((l) => (
              <div key={l.at} className="border-t border-line py-2 text-[13px] first:border-t-0"><b className="font-semibold">{l.school}</b> <span className="text-muted-2">· {l.city} · {l.size}</span>{l.score != null && <> <Pill kind={l.score >= 80 ? "met" : l.score >= 50 ? "open" : "late"} label={`Self-audit ${l.score}%`} /></>}<div className="font-mono text-[11.5px] text-muted-2">{l.name.toUpperCase()} · {l.role.toUpperCase()} · {l.phone}</div></div>
            )) : <p className="text-[13px] text-muted-2">Requests from the "Book free audit" form on the home page show up here.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
