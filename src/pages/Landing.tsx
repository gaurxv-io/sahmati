import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { Logo, Seal } from "@/components/brand";
import { toast } from "@/components/toast";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { DeadlineLine } from "@/components/landing/DeadlineLine";
import { QuickCheck, type QuickResult } from "@/components/landing/QuickCheck";
import { ReceiptCheck } from "@/components/landing/ReceiptCheck";
import { MobileCta } from "@/components/landing/MobileCta";
import { actions, useDB } from "@/lib/store";

const GAZETTE = "https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf";
const PIB = "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf";

const HEADER_GAP = 72; // px kept clear under the sticky header when jumping to a section

// Smooth, eased wheel scrolling on the landing page only. The console keeps native scroll,
// and people who ask their OS for reduced motion get native scroll too.
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.12 });
    // In-page links ("#faq"): glide there and stop below the sticky header.
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const target = link && link.hash.length > 1 ? document.getElementById(link.hash.slice(1)) : null;
      if (!link || !target || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -HEADER_GAP });
      history.pushState(null, "", link.hash);
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); lenis.destroy(); };
  }, []);
}

function Section({ id, title, intro, children, white }: { id?: string; title: string; intro?: ReactNode; children: ReactNode; white?: boolean }) {
  return (
    <section id={id} className={white ? "border-y border-line bg-white" : ""}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-20 sm:px-8 sm:py-24">
        <div className="flex max-w-[720px] flex-col gap-4">
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">{title}</h2>
          {intro && <p className="max-w-[600px] text-[17px] leading-relaxed text-muted">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

const LAW = [
  ["Parent consent for every child", "For anyone under 18, the school needs verifiable consent from a parent before processing their data. Photos, publicity and third-party apps need it too."],
  ["Parents get real rights", "Parents can ask to see, correct or delete their child's data, and withdraw consent as easily as they gave it."],
  ["Breaches must be reported", "If student data leaks, the school informs the Data Protection Board and parents, with a detailed report within 72 hours."],
  ["Penalties are significant", "Up to ₹250 crore per instance, and up to ₹200 crore for failures around children's data."],
];

const STEPS = [
  ["Free audit", "We map where your school keeps student data and give you a written gap report."],
  ["Upload students", "Import the Excel sheet you already have. No ERP needed."],
  ["Consent on WhatsApp", "Parents get a link in their language, choose permissions and confirm with a one-time code."],
  ["Track and remind", "See consent class by class and remind pending parents in one click."],
  ["Stay compliant", "Handle parent requests, breach plans and reports, and download proof anytime."],
];

const FAQ = [
  ["Do parents have to pay to give consent?", "No. Consent is always free."],
  ["We don't have an ERP. Can we still use Sahmati?", "Yes. Upload an Excel sheet of students and parent numbers. If you use an ERP, Sahmati works alongside it."],
  ["Where is our data stored?", "On servers in India, encrypted, with each school's data kept separate. We sign a Data Processing Agreement with every school."],
  ["What if a parent doesn't use WhatsApp?", "They can consent by SMS link, or on paper at the school office, recorded in Sahmati as assisted consent."],
  ["Who is legally responsible, the school or Sahmati?", "The school remains responsible under the Act. Sahmati processes data on the school's behalf under a written agreement and helps you meet the obligations."],
  ["What happens after the deadline?", "Every new admission needs consent, parents keep making requests, and breach plans need upkeep. Sahmati keeps running all of it each year."],
];

export default function Landing() {
  const db = useDB()!;
  const [form, setForm] = useState({ name: "", role: "Principal", school: "", city: "", phone: "", size: "500 – 1,000" });
  const [sent, setSent] = useState(false);
  const [quick, setQuick] = useState<QuickResult | null>(null);

  useSmoothScroll();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\+?[\d\s-]{10,14}$/.test(form.phone)) { toast("Enter a 10-digit mobile number so we can reach you on WhatsApp."); return; }
    await actions.addLead({ ...form, ...(quick ? { score: quick.score, gaps: quick.gaps } : {}) });
    setSent(true);
  };

  return (
    <div className="bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3.5 sm:px-8">
          <Logo />
          <nav className="ml-auto hidden items-center gap-6 text-sm lg:flex" aria-label="Main">
            {[["#why", "The law"], ["#check", "Quick check"], ["#how", "How it works"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([h, l]) => (
              <a key={h} href={h} className="text-muted hover:text-ink">{l}</a>
            ))}
            <Link to="/login" className="text-muted hover:text-ink">Sign in</Link>
          </nav>
          <a href="#audit" className="btn btn-primary ml-auto lg:ml-0">Book free audit</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pb-16 pt-12 sm:px-8 xl:grid-cols-[minmax(0,1fr)_640px] xl:gap-8 xl:pb-20 xl:pt-16">
        <div className="flex max-w-[600px] flex-col gap-6">
          <a href="#deadline" className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-muted hover:text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Every school must comply by 13 May 2027
          </a>
          <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[64px]">Make your school DPDP Ready.</h1>
          <p className="max-w-[540px] text-[19px] leading-[1.55] text-muted">
            Parents give consent on WhatsApp in under a minute. Every consent lands in your register with a receipt anyone can check, so you can show the Data Protection Board your school is compliant.
          </p>
          <div id="hero-cta" className="flex flex-wrap gap-3">
            <a href="#audit" className="btn btn-primary btn-lg">Book a free DPDP audit</a>
            <Link to="/app" className="btn btn-lg">Try the live demo <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-muted-2">
            {["Free for your school in year one", "Always free for parents", "Data stored in India"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green" strokeWidth={2.6} />{t}</li>
            ))}
          </ul>
        </div>
        <HeroDemo db={db} />
      </div>

      <section id="deadline" className="border-y border-line bg-white" aria-label="DPDP timeline">
        <DeadlineLine />
      </section>

      <Section id="why" title="Every school holds children's data. The law now asks you to show you protect it.">
        <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {LAW.map(([t, p]) => (
            <div key={t} className="flex flex-col gap-2 border-t border-line pt-5">
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="max-w-[480px] text-[15.5px] leading-relaxed text-muted">{p}</p>
            </div>
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-2">
          Read it in the government's words:
          <a href={GAZETTE} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold">DPDP Rules 2025, Gazette <ExternalLink className="h-3.5 w-3.5" /></a>
          <a href={PIB} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold">PIB explainer <ExternalLink className="h-3.5 w-3.5" /></a>
        </p>
      </Section>

      <Section id="check" title="Where does your school stand?" intro="Four questions from our self-audit. Your answers stay on this page until you ask for an audit." white>
        <QuickCheck onResult={setQuick} />
      </Section>

      <Section id="how" title="Five steps. No new software for your staff to learn.">
        <ol className="steps grid gap-8 lg:grid-cols-5 lg:gap-6">
          {STEPS.map(([t, p], i) => (
            <li key={t} className="step relative flex gap-4 lg:flex-col lg:gap-3">
              <span className="relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-2 bg-white text-[14px] font-semibold text-ink">{i + 1}</span>
              <span className="flex flex-col gap-1.5">
                <b className="text-base font-semibold">{t}</b>
                <span className="text-[14.5px] leading-relaxed text-muted">{p}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1200px] items-start gap-12 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,1fr)_520px]">
          <div className="flex flex-col gap-5">
            <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">Proof that anyone can check.</h2>
            <p className="max-w-[560px] text-[17px] leading-relaxed text-muted">
              Every consent is written to a hash-chained ledger. Change one old record and every record after it stops matching, so tampering shows. Parents, inspectors and the Board can check any receipt themselves.
            </p>
            <div className="mt-2 flex items-center gap-5">
              <Seal earned size="md" />
              <p className="max-w-[360px] text-[14.5px] text-muted">Schools that finish notices, consent and safeguards get the DPDP Ready School badge for their website, brochures and notice board.</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[14.5px] font-semibold">
              <Link to="/app" className="inline-flex items-center gap-1">Open the school console <ArrowRight className="h-3.5 w-3.5" /></Link>
              <Link to="/c/$sid" params={{ sid: "s003" }} className="inline-flex items-center gap-1">See the parent's consent page <ArrowRight className="h-3.5 w-3.5" /></Link>
              <Link to="/app/ledger" className="inline-flex items-center gap-1">Inspect the ledger <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
          <ReceiptCheck />
        </div>
      </section>

      <Section id="pricing" title="Free for your school in year one.">
        <div className="grid gap-4 md:grid-cols-3">
          {([
            ["Your school, year one", "₹0", "Free audit, setup, the WhatsApp consent drive, dashboard, reports and the DPDP Ready badge.", true],
            ["Parents", "Free, always", "Giving, changing or withdrawing consent never costs a parent anything.", false],
            ["Your school, from year two", "Per student", "An annual plan to keep records secure, handle requests and take consent for new admissions.", false],
          ] as const).map(([l, p, d, hot]) => (
            <div key={l} className={`flex flex-col gap-3 rounded-xl border bg-white p-6 ${hot ? "border-green-line shadow-card" : "border-line"}`}>
              <span className="text-[13.5px] font-medium text-muted-2">{l}</span>
              <b className="text-[32px] font-semibold tracking-[-0.03em]">{p}</b>
              <p className="text-[15px] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="faq" title="Questions principals ask first." white>
        <div className="grid gap-x-10 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="faq-item border-t border-line py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">{q}<span className="faq-plus text-xl font-normal leading-none text-muted-2" aria-hidden>+</span></summary>
              <p className="mt-3 text-[15px] text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section id="audit" className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">Find out where your school stands. 45 minutes, no cost.</h2>
          <p className="max-w-[520px] text-base text-muted">We visit your school, review how student data is collected and stored, and send a written report of what to fix before the deadline.</p>
          {quick ? (
            <p className="flex max-w-[520px] items-start gap-2 rounded-lg border border-green-line bg-green-soft px-3.5 py-2.5 text-[14px] text-ink-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />We'll bring your quick check to the visit: {quick.score}% ready{quick.gaps.length ? `, ${quick.gaps.length} ${quick.gaps.length === 1 ? "gap" : "gaps"} to fix` : ""}.
            </p>
          ) : (
            <p className="text-sm text-muted">Not sure yet? <Link to="/audit" className="font-semibold underline underline-offset-2">Take the 5-minute self-audit first.</Link></p>
          )}
        </div>
        {sent ? (
          <div className="feed-in flex flex-col items-start justify-center gap-3 rounded-xl border border-green-line bg-green-soft p-8">
            <b className="text-xl font-semibold">Thanks, {form.name.split(" ")[0] || "we've got it"}.</b>
            <p className="text-muted">We'll message you on WhatsApp within one working day to fix a time for {form.school || "your school"}'s audit.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-white p-6 sm:grid-cols-2">
            {([["name", "Your name"], ["school", "School name"], ["city", "City"], ["phone", "Phone / WhatsApp"]] as const).map(([k, l]) => (
              <label key={k} className="flex flex-col gap-1.5 text-[13px] font-medium">
                {l}
                <input id={`lead-${k}`} required className="field min-h-11 text-sm" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} inputMode={k === "phone" ? "tel" : undefined} autoComplete={k === "name" ? "name" : k === "phone" ? "tel" : undefined} />
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

      <footer className="border-t border-line bg-white pb-24 md:pb-0">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-8 px-4 py-10 sm:px-8">
          <div className="flex max-w-xs flex-col gap-3"><Logo /><p className="text-[13px] text-muted-2">DPDP compliance for Indian schools. Sahmati is not a law firm; information here is general guidance, not legal advice.</p></div>
          <div className="flex gap-12 text-[13px]">
            <div className="flex flex-col gap-2"><span className="text-[12px] font-medium text-muted-2">Product</span><Link to="/app">Live demo</Link><Link to="/verify">Verify a receipt</Link><Link to="/audit">Self-audit</Link><a href="#pricing">Pricing</a></div>
            <div className="flex flex-col gap-2"><span className="text-[12px] font-medium text-muted-2">Learn</span><a href={GAZETTE} target="_blank" rel="noopener">DPDP Rules 2025</a><a href={PIB} target="_blank" rel="noopener">PIB explainer</a><a href="#faq">FAQ</a></div>
          </div>
          <span className="w-full text-[12px] text-muted-2">© 2026 Sahmati. Data stored in Mumbai, India.</span>
        </div>
      </footer>

      <MobileCta />
    </div>
  );
}
