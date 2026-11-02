import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Crest, Logo } from "@/components/brand";
import { useDB } from "@/lib/store";

export default function Login() {
  const db = useDB()!;
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <Logo />
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">School sign in</span>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">Sign in to your school's console</h1>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">Registered mobile number
            <input id="login-phone" className="field min-h-11 font-mono text-sm" inputMode="tel" placeholder="+91 98XXX XXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <button className="btn btn-primary btn-lg" disabled title="Phone sign-in arrives with the production backend">Send sign-in code</button>
          <div className="flex items-center gap-3 text-xs text-muted-2"><span className="h-px flex-1 bg-line" />OR EXPLORE THE DEMO<span className="h-px flex-1 bg-line" /></div>
          <button className="flex items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-line-2 hover:bg-canvas" onClick={() => nav({ to: "/app" })}>
            <Crest name={db.school.name} />
            <span className="min-w-0 flex-1"><b className="block text-sm font-semibold">{db.school.name}</b><span className="font-mono text-[11px] text-muted-2">{db.school.slug}.sahmati.in · sample data</span></span>
            <span className="text-sm font-semibold text-green">Open</span>
          </button>
        </div>
        <p className="text-center text-xs text-muted-2">New school? <a href="/#audit" className="font-semibold">Book a free DPDP audit</a></p>
      </div>
    </div>
  );
}
