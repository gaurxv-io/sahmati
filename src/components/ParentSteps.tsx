import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, Lock } from "lucide-react";

// How a parent gives consent: a phone that walks through the four steps on its own while the
// section is on screen, with the step list beside it. Screens 2–4 are screenshots of the real
// parent page (public/landing/phone-*.jpg); the WhatsApp message is drawn.

const img = (name: string) => `${import.meta.env.BASE_URL}landing/${name}`;
const STEP_MS = 4200;

type Step = { title: string; body: string; shot?: string; alt: string; tap?: { x: number; y: number } };
const STEPS: Step[] = [
  { title: "A link arrives on WhatsApp", body: "The school sends each parent a personal link for their child. No app to install, no password.", alt: "The school's WhatsApp message with a consent link for Vihaan.", tap: { x: 50, y: 66 } },
  { title: "Read and choose", body: "The parent sees what the school keeps and why, then says yes or no to photos and newsletters. In English, Hindi and six more languages.", shot: "phone-choose.jpg", alt: "Consent page: what the school keeps, and the parent ticking photos on the school website.", tap: { x: 11, y: 63 } },
  { title: "Confirm with a code", body: "A 6-digit code goes to the parent's own phone, so the school can show it was really them.", shot: "phone-otp.jpg", alt: "Consent page: the 6-digit code entered and the Give consent button.", tap: { x: 50, y: 87 } },
  { title: "Get a receipt", body: "The parent gets a receipt number on WhatsApp, and can change or withdraw consent any time from the same link.", shot: "phone-receipt.jpg", alt: "Consent recorded, with the receipt number, student, parent, time and OTP check." },
];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(!!e?.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on] as const;
}

function WhatsAppScreen() {
  return (
    <div className="flex h-full flex-col bg-[#ECE7DE]">
      <div className="flex items-center gap-2.5 bg-[#F6F6F3] px-3 py-2.5">
        <ChevronLeft className="h-4 w-4 text-muted" aria-hidden />
        <span className="grid h-8 w-8 place-items-center rounded-full bg-green text-[11px] font-bold text-white">GV</span>
        <span className="flex min-w-0 flex-col leading-tight">
          <b className="truncate text-[13px] font-semibold text-ink">Green Valley Public School</b>
          <span className="text-[11px] text-muted-2">School office</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3 pt-4">
        <span className="mx-auto rounded-md bg-white/80 px-2 py-0.5 text-[10.5px] text-muted-2">Today</span>
        <div className="max-w-[88%] rounded-[4px_12px_12px_12px] bg-white px-3 py-2.5 text-[13px] leading-snug text-ink-2 shadow-[0_1px_1px_rgba(15,20,18,0.06)]">
          <p>Namaste Meena ji. Under India's new data protection law we need your consent to keep Vihaan's school records. It takes under a minute.</p>
          <p lang="hi" className="mt-1.5 text-[12.5px] text-muted">कृपया नीचे दिए लिंक से सहमति दें।</p>
          <span className="mt-2.5 block rounded-md border border-black/5 bg-[#F3F7F4] px-2.5 py-2">
            <b className="block text-[12.5px] font-semibold text-green">Consent for Vihaan · UKG-A</b>
            <span className="block text-[11px] text-muted-2">greenvalley.sahmati.in</span>
          </span>
          <span className="mt-1 block text-right text-[10px] text-muted-3">10:24 ✓✓</span>
        </div>
      </div>
    </div>
  );
}

function Phone({ active }: { active: number }) {
  return (
    <div className="ps-phone relative mx-auto" aria-live="polite">
      <div className="ps-screen relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between bg-white px-6 pb-1 pt-2.5 text-[11.5px] font-semibold text-ink">
          <span>10:24</span>
          <span className="ps-island" aria-hidden />
          <span className="flex items-center gap-1" aria-hidden>
            <span className="flex items-end gap-[2px]">{[4, 6, 8, 10].map((h) => <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />)}</span>
            <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-ink p-[1.5px]"><span className="block h-full w-3/4 rounded-[1px] bg-ink" /></span>
          </span>
        </div>
        <div className={`relative z-10 flex items-center justify-center gap-1 bg-white pb-2 text-[11px] text-muted-2 transition-opacity duration-300 ${active === 0 ? "opacity-0" : "opacity-100"}`} aria-hidden>
          <Lock className="h-3 w-3" />greenvalley.sahmati.in
        </div>
        <div className="absolute inset-x-0 bottom-0 top-[30px]">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`ps-slide absolute inset-x-0 bottom-0 ${i === 0 ? "top-0" : "top-[24px]"} ${i === active ? "ps-slide-on" : i < active ? "ps-slide-past" : ""}`} aria-hidden={i !== active}>
              {s.shot
                ? <img src={img(s.shot)} alt={s.alt} width={600} height={1246} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                : <div role="img" aria-label={s.alt} className="h-full"><WhatsAppScreen /></div>}
              {s.tap && i === active && <span key={`tap-${active}`} className="ps-tap" style={{ left: `${s.tap.x}%`, top: `${s.tap.y}%` }} aria-hidden />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ParentSteps() {
  const [ref, onScreen] = useOnScreen<HTMLDivElement>();
  const [active, setActive] = useState(0);
  const playing = onScreen && !reduced();

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, active]);

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
      <div className="order-2 flex flex-col gap-6 lg:order-1">
        <ol className="flex flex-col gap-2">
          {STEPS.map((s, i) => {
            const on = i === active;
            return (
              <li key={s.title}>
                <button type="button" onClick={() => setActive(i)} aria-current={on ? "step" : undefined}
                  className={`ps-step relative flex w-full gap-4 overflow-hidden rounded-xl border px-5 py-4 text-left ${on ? "border-green-line bg-white shadow-card" : "border-transparent hover:bg-canvas"}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors ${on ? "bg-brand text-brand-ink" : "border border-line-2 bg-white text-muted"}`}>{i + 1}</span>
                  <span className="flex flex-col gap-1">
                    <b className={`text-[16px] font-semibold ${on ? "text-ink" : "text-ink-2"}`}>{s.title}</b>
                    <span className={`ps-body text-[14.5px] leading-relaxed text-muted ${on ? "ps-body-on" : ""}`}>{s.body}</span>
                  </span>
                  {on && playing && <span key={`bar-${active}`} className="ps-progress absolute inset-x-0 bottom-0 h-[3px] bg-brand-hover" style={{ animationDuration: `${STEP_MS}ms` }} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-1">
          <Link to="/c/$sid" params={{ sid: "s003" }} className="btn btn-lg">Try it as a parent <ArrowRight className="h-4 w-4" /></Link>
          <span className="text-[14px] text-muted-2">Opens the real consent page for a sample student.</span>
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <Phone active={active} />
      </div>
    </div>
  );
}
