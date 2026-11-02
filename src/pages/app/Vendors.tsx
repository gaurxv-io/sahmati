import { useState, type FormEvent } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { Pill } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { fmtDate } from "@/lib/derive";
import { copyText } from "@/lib/clipboard";
import type { DpaStatus } from "@/lib/types";
import { PageHead } from "./Layout";

const DPA: Record<DpaStatus, [string, "met" | "open" | "late"]> = { signed: ["Signed", "met"], sent: ["Sent", "open"], missing: ["Missing", "late"] };

export const DPA_CHECKLIST = `Data processing agreement checklist (Sahmati)
1. Purpose limited to the school's instructions: the vendor uses student data only to provide the agreed service.
2. Security safeguards: reasonable technical and organisational measures to protect the data.
3. Breach notice: the vendor tells the school about any breach within 24 hours.
4. Deletion at contract end: all student data is deleted or returned when the contract ends.
5. No onward sharing: no data is shared with anyone else without the school's written consent.`;

export default function Vendors() {
  const db = useDB()!;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", data: "", dpa: "missing" as DpaStatus });
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim().slice(0, 100), role = form.role.trim().slice(0, 100);
    const data = form.data.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10).map((x) => x.slice(0, 40));
    if (!name || !role) { setErr("Enter the vendor's name and what they do."); return; }
    setErr("");
    const signed = form.dpa === "signed";
    await actions.addVendor({ name, role, data, dpa: form.dpa, signedAt: signed ? new Date().toISOString() : null, review: signed ? new Date(Date.now() + 365 * 86400000).toISOString() : null });
    setForm({ name: "", role: "", data: "", dpa: "missing" }); setOpen(false);
    toast(`${name} added`);
  };

  return (
    <>
      <PageHead n="08" label="Vendors" title="Vendor register" desc="Every third party that touches student data, what they get, and whether a data processing agreement is signed.">
        <button className="btn btn-primary" onClick={() => setOpen(!open)}><Plus className="h-4 w-4" />Add vendor</button>
      </PageHead>

      {open && (
        <form onSubmit={submit} className="grid min-w-0 gap-3 rounded-xl border border-line bg-white p-[18px] shadow-card sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2"><h2 className="text-base font-semibold">Add vendor</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}><X className="h-3.5 w-3.5" />Close</button></div>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">Vendor name<input id="v-name" className="field min-h-10 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">What they do<input id="v-role" className="field min-h-10 text-sm" placeholder="Canteen payments app" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">Data shared (comma separated)<input id="v-data" className="field min-h-10 text-sm" placeholder="Names, Phones" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">DPA status<select id="v-dpa" className="field min-h-10 text-sm" value={form.dpa} onChange={(e) => setForm({ ...form, dpa: e.target.value as DpaStatus })}><option value="missing">Missing</option><option value="sent">Sent</option><option value="signed">Signed</option></select></label>
          {err && <p className="text-[13px] text-danger sm:col-span-2">{err}</p>}
          <button className="btn btn-primary w-fit sm:col-span-2" type="submit">Add vendor</button>
        </form>
      )}

      <div className="panel min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead><tr><th className="th">Vendor</th><th className="th">Data shared</th><th className="th">DPA</th><th className="th">Signed</th><th className="th">Next review</th><th className="th" /></tr></thead>
            <tbody>
              {db.vendors.map((v) => (
                <tr key={v.id} className="[&:last-child>td]:border-b-0">
                  <td className="td"><b className="font-semibold text-ink">{v.name}</b><div className="text-[12px] text-muted-2">{v.role}</div></td>
                  <td className="td"><span className="inline-flex flex-wrap gap-1">{v.data.map((d) => <span key={d} className="tag tag-on">{d.toUpperCase()}</span>)}</span></td>
                  <td className="td"><Pill kind={DPA[v.dpa][1]} label={DPA[v.dpa][0]} /></td>
                  <td className="td whitespace-nowrap text-muted-2">{v.signedAt ? fmtDate(v.signedAt) : "—"}</td>
                  <td className="td whitespace-nowrap text-muted-2">{v.review ? fmtDate(v.review) : "—"}</td>
                  <td className="td"><div className="flex justify-end">{v.dpa !== "signed" && <button className="btn btn-sm" onClick={async () => { await actions.signDpa(v.id); toast(`DPA signed with ${v.name}`); }}><Check className="h-3.5 w-3.5" />Mark DPA signed</button>}</div></td>
                </tr>
              ))}
              {!db.vendors.length && <tr><td colSpan={6} className="td py-9 text-center text-muted-2">No vendors listed yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-3 p-[18px]">
        <p className="min-w-0 text-[13px] text-muted">Sahmati gives you a ready data processing agreement template for vendors.</p>
        <button className="btn btn-sm" onClick={() => copyText(DPA_CHECKLIST, "DPA checklist copied")}><Copy className="h-3.5 w-3.5" />Copy DPA checklist</button>
      </div>
    </>
  );
}
