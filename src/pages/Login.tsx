import { BASE, appUrl } from "@/lib/base";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Crest, Logo } from "@/components/brand";
import { signOut, useDB, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const db = useDB()!;
  const nav = useNavigate();
  const { user } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Enter your school email address."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: appUrl("/app") } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  };
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <Logo />
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">School sign in</span>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">Sign in to your school's console</h1>
          </div>
          {user ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted">Signed in as <span className="font-mono text-ink">{user.email}</span></p>
              <button className="btn btn-primary btn-lg" onClick={() => nav({ to: "/app" })}>Open my school's console</button>
              <button className="btn btn-ghost btn-sm w-fit" onClick={() => signOut()}>Sign out</button>
            </div>
          ) : sent ? (
            <div className="flex flex-col gap-2 rounded-xl border border-green-line bg-green-soft p-4 text-[13px] text-ink-2">
              <b className="text-green">Check your email</b>
              <span>We sent a sign-in link to <span className="font-mono">{email.trim()}</span>. Open it on this device to enter your console.</span>
              <button className="w-fit text-xs font-semibold text-green" onClick={() => setSent(false)}>Use a different email</button>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">School email
                <input id="login-email" type="email" autoComplete="email" className="field min-h-11 font-mono text-sm" placeholder="principal@yourschool.in" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
              </label>
              {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}
              <button className="btn btn-primary btn-lg" disabled={busy} onClick={send}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
            </>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-2"><span className="h-px flex-1 bg-line" />OR EXPLORE THE DEMO<span className="h-px flex-1 bg-line" /></div>
          <button className="flex items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-line-2 hover:bg-canvas" onClick={() => nav({ to: "/app" })}>
            <Crest name={db.school.name} />
            <span className="min-w-0 flex-1"><b className="block text-sm font-semibold">{db.school.name}</b><span className="font-mono text-[11px] text-muted-2">{db.school.slug}.sahmati.in · sample data</span></span>
            <span className="text-sm font-semibold text-green">Open</span>
          </button>
        </div>
        <p className="text-center text-xs text-muted-2">New school? <a href={`${BASE}/#audit`} className="font-semibold">Book a free DPDP audit</a></p>
      </div>
    </div>
  );
}
