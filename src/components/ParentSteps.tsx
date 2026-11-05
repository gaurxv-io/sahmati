import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

// How a parent gives consent, shown with screenshots of the real parent page
// (public/landing/*.jpg, taken from the sample school at phone size).

const img = (name: string) => `${import.meta.env.BASE_URL}landing/${name}`;

const STEPS: { title: string; body: string; shot?: { src: string; w: number; h: number; alt: string } }[] = [
  { title: "A link arrives on WhatsApp", body: "The school sends each parent a personal link for their child. No app to install, no password." },
  { title: "Read and choose", body: "The parent sees what the school keeps and why, then says yes or no to photos and newsletters. In English, Hindi and six more languages.", shot: { src: img("consent-choose.jpg"), w: 780, h: 510, alt: "Parent consent page: school records required, photos on the website ticked, newsletter photos unticked." } },
  { title: "Confirm with a code", body: "A 6-digit code goes to the parent's own phone, so the school can show it was really them.", shot: { src: img("consent-otp.jpg"), w: 780, h: 352, alt: "Parent consent page: a 6-digit code entered and the Give consent button." } },
  { title: "Get a receipt", body: "The parent gets a receipt number on WhatsApp. They can change or withdraw consent any time from the same link.", shot: { src: img("consent-receipt.jpg"), w: 780, h: 730, alt: "Consent recorded, with receipt number, student, parent, time and OTP verification." } },
];

function WhatsAppPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 bg-[#ECE7DE] p-4" aria-label="A school's WhatsApp message with a consent link" role="img">
      <span className="mx-auto rounded-md bg-white/80 px-2 py-0.5 text-[10.5px] text-muted-2">Today</span>
      <div className="max-w-[92%] rounded-[4px_12px_12px_12px] bg-white px-3 py-2.5 text-[13px] leading-snug text-ink-2 shadow-[0_1px_1px_rgba(15,20,18,0.06)]">
        <b className="block text-[12px] font-semibold text-green">Green Valley Public School</b>
        <p className="mt-1">Namaste Meena ji. Please give consent for how we use Vihaan's data. It takes under a minute.</p>
        <p lang="hi" className="mt-1 text-[12.5px] text-muted">कृपया नीचे दिए लिंक से सहमति दें।</p>
        <span className="mt-2 block rounded-md bg-[#F3F7F4] px-2.5 py-2">
          <b className="block text-[12.5px] font-semibold text-green">Consent for Vihaan · UKG-A</b>
          <span className="block text-[11px] text-muted-2">greenvalley.sahmati.in</span>
        </span>
        <span className="mt-1 block text-right text-[10px] text-muted-3">10:24 ✓✓</span>
      </div>
    </div>
  );
}

export function ParentSteps() {
  return (
    <div className="flex flex-col gap-8">
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-4">
            <div className="h-[260px] overflow-hidden rounded-xl border border-line bg-canvas">
              {s.shot ? (
                <img src={s.shot.src} width={s.shot.w} height={s.shot.h} alt={s.shot.alt} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
              ) : (
                <WhatsAppPreview />
              )}
            </div>
            <div className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-2 bg-white text-[13px] font-semibold">{i + 1}</span>
              <div className="flex flex-col gap-1">
                <b className="text-base font-semibold">{s.title}</b>
                <p className="text-[14.5px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link to="/c/$sid" params={{ sid: "s003" }} className="btn btn-lg">Try it as a parent <ArrowRight className="h-4 w-4" /></Link>
        <span className="text-[14px] text-muted-2">Opens the real consent page for a sample student. Consent is always free for parents.</span>
      </div>
    </div>
  );
}
