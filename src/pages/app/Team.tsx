import { useState, type FormEvent } from "react";
import { Copy, UserPlus, X } from "lucide-react";
import { Pill } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB, useStore } from "@/lib/store";
import { ROLES, can, fmtDate, initials, roleLabel } from "@/lib/derive";
import { copyText } from "@/lib/clipboard";
import type { Role } from "@/lib/types";
import { PageHead } from "./Layout";

const ROLE_KEYS = Object.keys(ROLES) as Role[];
const splitClasses = (v: string) => v.split(/[,\s]+/).map((c) => c.trim()).filter(Boolean);

export default function Team() {
  const db = useDB()!;
  const { mode, user } = useStore();
  const admin = can(db).admin;
  const [form, setForm] = useState({ email: "", name: "", role: "office" as Role, classes: "" });
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ userId: string; role: Role; classes: string } | null>(null);

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await actions.inviteStaff({ email: form.email, name: form.name, role: form.role, classes: splitClasses(form.classes) });
      toast(`Invite saved for ${form.email}`);
      setForm({ email: "", name: "", role: "office", classes: "" });
    } catch { /* toast already shown */ } finally { setBusy(false); }
  };
  const inviteMsg = (email: string, role: string) => `You've been added to ${db.school.name} on Sahmati as ${role}. Sign in with ${email} at ${window.location.origin}/login to open the school console.`;

  return (
    <>
      <PageHead n="07" label="Team" title="Staff and what they can see" desc="Each person signs in with their own email. Roles are enforced by the database, so a teacher only ever receives their own classes' records." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLE_KEYS.map((r) => (
          <div key={r} className="flex flex-col gap-1 rounded-xl border border-line bg-white p-4">
            <span className="eyebrow">{ROLES[r].label}</span>
            <span className="text-[12.5px] text-muted-2">{ROLES[r].desc}</span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="panel min-w-0">
          <div className="flex items-center justify-between px-[18px] pt-4"><h2 className="text-base font-semibold">Team</h2><span className="eyebrow">{db.staff.length} people</span></div>
          <div className="px-[18px] pb-3 pt-2">
            {db.staff.map((m) => {
              const me = mode === "live" && m.userId === user?.id;
              const editing = edit?.userId === m.userId;
              return (
                <div key={m.userId} className="flex flex-col gap-2 border-t border-line py-3 text-[13px] first:border-t-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green-soft text-[11px] font-bold text-green">{initials(m.name || m.email)}</span>
                    <div className="min-w-0 flex-1"><b className="font-semibold">{m.name || m.email}</b>{me && <span className="text-muted-2"> · you</span>}<div className="truncate font-mono text-[11.5px] text-muted-2">{m.email}</div></div>
                    <Pill kind={m.role === "principal" ? "given" : m.role === "auditor" ? "withdrawn" : "open"} label={roleLabel(m.role, m.classes)} />
                    {admin && !editing && (
                      <span className="flex gap-1.5">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEdit({ userId: m.userId, role: m.role, classes: m.classes.join(", ") })}>Change role</button>
                        <button className="btn btn-ghost btn-sm" aria-label={`Remove ${m.name || m.email}`} onClick={async () => { if (!confirm(`Remove ${m.name || m.email} from the team?`)) return; try { await actions.removeStaff(m.userId); toast("Removed from the team"); } catch { /* toast shown */ } }}><X className="h-3.5 w-3.5" />Remove</button>
                      </span>
                    )}
                  </div>
                  {editing && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas p-2.5">
                      <select aria-label="Role" className="field" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>{ROLE_KEYS.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}</select>
                      {edit.role === "teacher" && <input aria-label="Classes" className="field w-36" placeholder="Classes: 6, 7, 8" value={edit.classes} onChange={(e) => setEdit({ ...edit, classes: e.target.value })} />}
                      <button className="btn btn-primary btn-sm" onClick={async () => { try { await actions.setStaffRole(m.userId, edit.role, splitClasses(edit.classes)); toast("Role updated"); setEdit(null); } catch { /* toast shown */ } }}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}
            {!db.staff.length && <p className="py-4 text-center text-muted-2">No team yet.</p>}
          </div>
          {db.invites.length > 0 && (
            <>
              <div className="px-[18px] pt-2"><h2 className="text-base font-semibold">Waiting to sign in</h2></div>
              <div className="px-[18px] pb-3 pt-2">
                {db.invites.map((i) => (
                  <div key={i.email} className="flex flex-wrap items-center gap-2.5 border-t border-line py-3 text-[13px] first:border-t-0">
                    <div className="min-w-0 flex-1"><b className="font-semibold">{i.name || i.email}</b><div className="truncate font-mono text-[11.5px] text-muted-2">{i.email} · INVITED {fmtDate(i.createdAt).toUpperCase()}</div></div>
                    <Pill kind="pending" label={roleLabel(i.role, i.classes)} />
                    <button className="btn btn-ghost btn-sm" onClick={() => copyText(inviteMsg(i.email, roleLabel(i.role, i.classes)), "Invite message copied")}><Copy className="h-3.5 w-3.5" />Copy invite</button>
                    {admin && <button className="btn btn-ghost btn-sm" onClick={async () => { await actions.cancelInvite(i.email); toast("Invite cancelled"); }}><X className="h-3.5 w-3.5" />Cancel</button>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {admin ? (
          <form onSubmit={invite} className="panel flex flex-col gap-3 p-[18px]">
            <h2 className="text-base font-semibold">Invite by email</h2>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">Email<input type="email" required className="field min-h-10 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="arun.mehta@school.in" /></label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">Name<input className="field min-h-10 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mr. Arun Mehta" /></label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">Role
              <select className="field min-h-10 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLE_KEYS.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}</select>
            </label>
            {form.role === "teacher" && <label className="flex flex-col gap-1.5 text-[13px] font-medium">Classes they teach<input required className="field min-h-10 text-sm" value={form.classes} onChange={(e) => setForm({ ...form, classes: e.target.value })} placeholder="6, 7, 8" /></label>}
            <p className="text-[12.5px] text-muted-2">They join your school the first time they sign in with this email. Use "Copy invite" to send them the sign-in link on WhatsApp or email.</p>
            <button className="btn btn-primary w-fit" disabled={busy}><UserPlus className="h-4 w-4" />Send invite</button>
          </form>
        ) : (
          <div className="panel p-[18px] text-[13px] text-muted">Only the Principal can invite people or change roles. You are signed in as <b className="font-semibold text-ink">{roleLabel(db.me.role, db.me.classes)}</b>.</div>
        )}
      </div>
    </>
  );
}
