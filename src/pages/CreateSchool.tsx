import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/brand";
import { createSchool, signOut, useStore } from "@/lib/store";

/** First sign-in: set up the school, then land on an empty console with the CSV import open. */
export default function CreateSchool() {
  const { user } = useStore();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", city: "", slug: "", dpo: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toSlug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40);
  const valid = f.name.trim() && f.city.trim() && /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(f.slug) && f.dpo.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) { setErr("Fill in every field. The web address uses 3–40 lowercase letters or numbers."); return; }
    setBusy(true); setErr("");
    try {
      await createSchool(f);
      nav({ to: "/app/students", search: { import: "1" } });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't create the school. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col gap-6">
        <Logo />
        <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">01 · Create your school</span>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">Set up your school's console</h1>
            <p className="text-[13px] text-muted">Signed in as <span className="font-mono">{user?.email}</span>. Only staff of this school will see its records.</p>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">School name
            <input id="cs-name" className="field min-h-11 text-sm" value={f.name} onChange={(e) => { const name = e.target.value; setF((p) => ({ ...p, name, slug: slugTouched ? p.slug : toSlug(name) })); }} placeholder="Green Valley Public School" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">City
            <input id="cs-city" className="field min-h-11 text-sm" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="New Delhi" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">Web address
            <span className="flex items-center gap-2"><input id="cs-slug" className="field min-h-11 min-w-0 flex-1 font-mono text-sm" value={f.slug} onChange={(e) => { setSlugTouched(true); setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) }); }} placeholder="greenvalley" /><span className="font-mono text-xs text-muted-2">.sahmati.in</span></span>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">Data protection contact
            <input id="cs-dpo" className="field min-h-11 text-sm" value={f.dpo} onChange={(e) => setF({ ...f, dpo: e.target.value })} placeholder="Mrs. R. Kapoor, Vice Principal" />
          </label>
          {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? "Creating…" : "Create school"}</button>
          <button type="button" className="text-xs font-semibold text-muted-2 hover:text-ink" onClick={() => signOut()}>Sign out</button>
        </form>
      </div>
    </div>
  );
}
