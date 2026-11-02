import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Logo, Seal } from "@/components/brand";
import { toast } from "@/components/toast";
import { actions, useDB } from "@/lib/store";
import { daysLeft, stats } from "@/lib/derive";

const GAZETTE = "https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf";
const PIB = "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf";

function Section({ id, label, title, children, white }: { id?: string; label: string; title: string; children: ReactNode; white?: boolean }) {
  return (
    <section id={id} className={white ? "border-y border-line bg-white" : ""}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-20 sm:px-8 sm:py-24">
        <div className="flex max-w-[720px] flex-col gap-4">
          <span className="font-mono text-xs tracking-[0.08em] text-muted-2">{label}</span>
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Landing() {
  const db = useDB()!;
  const st = stats(db);
  const [form, setForm] = useState({ name: "", role: "Principal", school: "", city: "", phone: "", size: "500 – 1,000" });
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\+?[\d\s-]{10,14}$/.test(form.phone)) { toast("Enter a 10-digit mobile number so we can reach you on WhatsApp."); return; }
    await actions.addLead(form);
    setSent(true);
  };

  return (
    <div className="bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3.5 sm:px-8">
          <Logo />
          <nav className="ml-auto hidden items-center gap-6 text-sm md:flex" aria-label="Main">
            {[["#why", "Why DPDP"], ["#how", "How it works"], ["#product", "Product"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([h, l]) => (
              <a key={h} href={h} className="text-muted hover:text-ink">{l}</a>
            ))}
            <Link to="/login" className="text-muted hover:text-ink">Sign in</Link>
          </nav>
          <a href="#audit" className="btn btn-primary ml-auto md:ml-0">Book free audit</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-14 sm:px-8 lg:grid-cols-[1fr_520px] lg:pb-24 lg:pt-20">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-white px-3 py-1 font-mono text-[11px] text-muted-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Full compliance due 13 May 2027 · {daysLeft()} days left
          </span>
          <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[64px]">Make your school DPDP Ready.</h1>
          <p className="max-w-[540px] text-[19px] leading-[1.55] text-muted">
            India's new data protection law asks schools to give parents clear notices, take verifiable parent consent, protect student data and report breaches. Sahmati handles consent over WhatsApp, keeps tamper-evident proof, and gets your school ready before the deadline.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#audit" className="btn btn-primary btn-lg">Book a free DPDP audit</a>
            <Link to="/app" className="btn btn-lg">Try the live demo <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <p className="font-mono text-[11px] text-muted-2">Free for schools in year 1 · Consent always free for parents · Data stored in India</p>
          <a href={GAZETTE} target="_blank" rel="noopener" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold underline underline-offset-2">Official DPDP Rules 2025 (Gazette, MeitY) <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>

        <Link to="/app" className="group block rounded-2xl border border-line bg-white p-5 text-ink shadow-card transition-shadow hover:text-ink hover:shadow-lift">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-2">{db.school.slug}.sahmati.in · Overview</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-hover" />Live demo</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[["Consent", `${Math.round(st.cov * 100)}%`, "text-green"], ["Pending", String(st.pending), "text-amber-ink"], ["Readiness", `${Math.round((st.ready / 5) * 100)}%`, "text-ink"]].map(([l, v, c]) => (
              <div key={l} className="rounded-lg border border-line p-3">
                <div className="font-mono text-[10px] uppercase text-muted-2">{l}</div>
                <div className={`text-2xl font-semibold tracking-[-0.02em] ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            {st.bands.map((b) => (
              <div key={b.name} className="grid grid-cols-[96px_1fr_36px] items-center gap-3 text-[13px]">
                <span>{b.name}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-track"><span className={`block h-full rounded-full ${b.pct < 0.8 ? "bg-amber" : "bg-brand-hover"}`} style={{ width: `${b.pct * 100}%` }} /></span>
                <span className="text-right font-mono text-xs text-muted">{Math.round(b.pct * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5 text-[13px]">
            <span className="text-muted-2">Sample school with 30 students</span>
            <span className="inline-flex items-center gap-1 font-semibold text-green group-hover:text-green-hover">Open console <ArrowRight className="h-3.5 w-3.5" /></span>
          </div>
        </Link>
      </div>

      <div className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1200px] sm:grid-cols-3">
          {[
            ["13 NOV 2025 · DONE", "DPDP Rules notified", "The 18-month countdown began. The Data Protection Board was set up.", false],
            ["13 NOV 2026", "Consent Manager rules begin", "Registered consent platforms can start operating.", false],
            ["13 MAY 2027 · DEADLINE", "Full compliance for every school", "Notices, consent, security, breach reporting and children's data rules all apply.", true],
          ].map(([d, t, p, hot], i) => (
            <div key={i} className={`flex flex-col gap-2 px-4 py-7 sm:px-8 ${i ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
              <span className={`font-mono text-xs ${hot ? "text-amber-ink" : "text-muted-2"}`}>{d as string}</span>
              <b className="text-[17px] font-semibold">{t as string}</b>
              <p className="text-sm text-muted">{p as string}</p>
            </div>
          ))}
        </div>
      </div>

      <Section id="why" label="01 · WHY DPDP MATTERS FOR SCHOOLS" title="Every school holds children's data. The law now asks you to show you protect it.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Parent consent for children", "For anyone under 18, verifiable parent consent is the default. Photos, publicity and third-party apps still need care."],
            ["Parents get real rights", "Parents can ask to see, correct or delete their child's data, and withdraw consent as easily as they gave it."],
            ["Breaches must be reported", "If student data leaks, the school must inform the Data Protection Board and parents, with a detailed report within 72 hours."],
            ["Penalties are significant", "Up to ₹250 crore per instance, and up to ₹200 crore for failures around children's data."],
          ].map(([t, p], i) => (
            <div key={t} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6">
              <span className="font-mono text-xs text-green">0{i + 1}</span>
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{p}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5 text-sm">
          <span className="font-mono text-[11px] text-muted-2">OFFICIAL SOURCES</span>
          <a href={GAZETTE} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold">DPDP Rules 2025 · Gazette PDF <ExternalLink className="h-3.5 w-3.5" /></a>
          <a href={PIB} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold">PIB explainer <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </Section>

      <Section id="how" label="02 · HOW IT WORKS" title="Five steps. No new software for your staff to learn." white>
        <div className="grid overflow-hidden rounded-xl border border-line sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Free audit", "We map where your school keeps student data and give you a written gap report."],
            ["Upload students", "Import your existing Excel sheet. No ERP needed."],
            ["Consent on WhatsApp", "Parents get a link in their language, choose permissions and verify with an OTP."],
            ["Track and remind", "See consent class by class and remind pending parents in one click."],
            ["Stay compliant", "Handle parent requests, breach plans and reports, and download proof anytime."],
          ].map(([t, p], i) => (
            <div key={t} className={`flex flex-col gap-2.5 bg-white p-6 ${i ? "border-t border-line sm:border-l lg:border-t-0" : ""}`}>
              <span className="font-mono text-xs text-green">STEP 0{i + 1}</span>
              <b className="text-base font-semibold">{t}</b>
              <p className="text-sm text-muted">{p}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="product" label="03 · THE PRODUCT" title="Try it yourself. It's live.">
        <div className="grid gap-4 md:grid-cols-3">
          {([
            ["/app", "School console", "Consent register, WhatsApp reminders, parent requests and the readiness checklist."],
            ["/c/$sid", "Parent consent page", "What a parent opens from WhatsApp. English and Hindi, OTP verified, no app to install."],
            ["/app/ledger", "Tamper-evident ledger", "Every consent is hash-chained. Try editing a record and watch verification catch it."],
          ] as const).map(([to, t, p]) => (
            <Link key={to} to={to} {...(to === "/c/$sid" ? { params: { sid: "s003" } } : {})} className="group flex flex-col gap-3 rounded-xl border border-line bg-white p-6 text-ink hover:text-ink hover:shadow-card">
              <b className="text-lg font-semibold">{t}</b>
              <p className="text-[15px] text-muted">{p}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-green group-hover:text-green-hover">Open <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          ))}
        </div>
      </Section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-4 py-20 sm:px-8 sm:py-24">
          <div className="flex flex-[0_1_300px] justify-center"><Seal earned size="xl" /></div>
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4">
            <span className="font-mono text-xs tracking-[0.08em] text-muted-2">04 · DPDP READY SCHOOL</span>
            <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">Show parents you take their child's privacy seriously.</h2>
            <p className="max-w-[620px] text-base leading-relaxed text-muted">Schools that complete notices, consent and data safeguards on Sahmati receive the DPDP Ready School badge for their website, admission brochures and notice board. Anyone can check a parent's consent receipt at <Link to="/verify" className="font-semibold">sahmati.in/verify</Link>.</p>
          </div>
        </div>
      </section>

      <Section id="pricing" label="05 · PRICING" title="Free for your school in year one.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["SCHOOL · YEAR 1", "₹0", "first year", "Free audit, setup, WhatsApp consent drive, dashboard, reports and the DPDP Ready badge.", true],
            ["PARENTS · CONSENT", "Free", "always", "Giving, changing or withdrawing consent never costs a parent anything.", false],
            ["SCHOOL · FROM YEAR 2", "Per student", "annual plan", "Keep records secure, handle requests and renew consent for new admissions.", false],
          ].map(([l, p, s, d, hot]) => (
            <div key={l as string} className={`flex flex-col gap-3 rounded-xl border bg-white p-6 ${hot ? "border-green-line shadow-card" : "border-line"}`}>
              <span className="font-mono text-xs text-muted-2">{l as string}</span>
              <div className="flex items-baseline gap-2"><b className="text-[32px] font-semibold tracking-[-0.03em]">{p as string}</b><span className="text-muted-2">{s as string}</span></div>
              <p className="text-[15px] text-muted">{d as string}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="faq" label="06 · FAQ" title="Questions principals ask first." white>
        <div className="grid gap-x-10 md:grid-cols-2">
          {[
            ["Do parents have to pay to give consent?", "No. Consent is always free."],
            ["We don't have an ERP. Can we still use Sahmati?", "Yes. Upload an Excel sheet of students and parent numbers. If you use an ERP, Sahmati works alongside it."],
            ["Where is our data stored?", "On servers in India, encrypted, with each school's data kept separate. We sign a Data Processing Agreement with every school."],
            ["What if a parent doesn't use WhatsApp?", "They can consent by SMS link, or on paper at the school office, recorded in Sahmati as assisted consent."],
            ["Who is legally responsible, the school or Sahmati?", "The school remains responsible under the Act. Sahmati processes data on the school's behalf under a written agreement and helps you meet the obligations."],
            ["What happens after the deadline?", "Every new admission needs consent, parents keep making requests, and breach plans need upkeep. Sahmati keeps running all of it each year."],
          ].map(([q, a]) => (
            <details key={q} className="group border-t border-line py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">{q}<span className="font-mono text-muted-2 group-open:rotate-45">+</span></summary>
              <p className="mt-3 text-[15px] text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section id="audit" className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <span className="font-mono text-xs tracking-[0.08em] text-muted-2">07 · FREE DPDP AUDIT</span>
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">Find out where your school stands. 45 minutes, no cost.</h2>
          <p className="max-w-[520px] text-base text-muted">We visit your school, review how student data is collected and stored, and send a written report of what to fix before the deadline.</p>
        </div>
        {sent ? (
          <div className="flex flex-col items-start justify-center gap-3 rounded-xl border border-green-line bg-green-soft p-8">
            <b className="text-xl font-semibold">Thanks, {form.name.split(" ")[0] || "we've got it"}.</b>
            <p className="text-muted">We'll message you on WhatsApp within one working day to fix a time for {form.school || "your school"}'s audit.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-white p-6 sm:grid-cols-2">
            {([["name", "Your name"], ["school", "School name"], ["city", "City"], ["phone", "Phone / WhatsApp"]] as const).map(([k, l]) => (
              <label key={k} className="flex flex-col gap-1.5 text-[13px] font-medium">
                {l}
                <input id={`lead-${k}`} required className="field min-h-11 text-sm" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} inputMode={k === "phone" ? "tel" : undefined} />
              </label>
            ))}
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">Role
              <select id="lead-role" className="field min-h-11 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{["Principal", "Trustee / Management", "Administrator", "Other"].map((o) => <option key={o}>{o}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">Number of students
              <select id="lead-size" className="field min-h-11 text-sm" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>{["Under 500", "500 – 1,000", "1,000 – 2,000", "Over 2,000"].map((o) => <option key={o}>{o}</option>)}</select>
            </label>
            <button className="btn btn-primary btn-lg sm:col-span-2" type="submit">Request free audit</button>
            <p className="text-xs text-muted-2 sm:col-span-2">We use these details only to contact you about the audit.</p>
          </form>
        )}
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-8 px-4 py-10 sm:px-8">
          <div className="flex max-w-xs flex-col gap-3"><Logo /><p className="text-[13px] text-muted-2">DPDP compliance for Indian schools. Sahmati is not a law firm; information here is general guidance, not legal advice.</p></div>
          <div className="flex gap-12 text-[13px]">
            <div className="flex flex-col gap-2"><span className="font-mono text-[11px] text-muted-2">PRODUCT</span><Link to="/app">Live demo</Link><Link to="/verify">Verify a receipt</Link><a href="#pricing">Pricing</a></div>
            <div className="flex flex-col gap-2"><span className="font-mono text-[11px] text-muted-2">LEARN</span><a href={GAZETTE} target="_blank" rel="noopener">DPDP Rules 2025</a><a href={PIB} target="_blank" rel="noopener">PIB explainer</a><a href="#faq">FAQ</a></div>
          </div>
          <span className="w-full font-mono text-[11px] text-muted-2">© 2026 Sahmati · Data region Mumbai</span>
        </div>
      </footer>
    </div>
  );
}
