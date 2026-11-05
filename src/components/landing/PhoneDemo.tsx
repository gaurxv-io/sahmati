import { Check, ChevronLeft, ShieldCheck } from "lucide-react";
import type { Student } from "@/lib/types";
import { clsName } from "@/components/HeroCard";

// A drawn phone that plays what a parent sees: the school's WhatsApp message, the consent
// choices, the OTP and the receipt. Purely illustrative; driven by HeroDemo.

export type Scene = "typing" | "message" | "consent" | "otp" | "done";

const first = (name: string) => name.split(" ")[0] ?? name;
const maskPhone = (p: string) => `+91 ${p.slice(0, 2)}••• ••${p.slice(-3)}`;
export const sampleReceipt = (s: Student, n: number) => `SAH-${String(31 + n).padStart(3, "0")}-${s.cls.toUpperCase().slice(0, 3)}${s.sec}`;

function Switch({ on, animate }: { on: boolean; animate?: boolean }) {
  return (
    <span className={`switch ${on ? "switch-on" : ""} ${animate ? "switch-anim" : ""}`} aria-hidden>
      <span className="switch-thumb" />
    </span>
  );
}

export function PhoneDemo({ scene, student, school, n }: { scene: Scene; student: Student; school: string; n: number }) {
  const child = first(student.name);
  const parent = first(student.parent);
  const photos = n % 2 === 0;
  const shown = (s: Scene[]) => s.includes(scene);

  return (
    <div className="phone" role="img" aria-label={`Illustration: ${student.parent} receives the school's message on WhatsApp, chooses permissions, confirms with a one-time code and gets a consent receipt.`}>
      <div className="phone-screen">
        <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[11px] font-semibold text-ink">
          <span>10:24</span>
          <span className="flex items-center gap-1" aria-hidden>
            <span className="flex items-end gap-[2px]">{[4, 6, 8, 10].map((h) => <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />)}</span>
            <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-ink p-[1.5px]"><span className="block h-full w-3/4 rounded-[1px] bg-ink" /></span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 border-b border-black/5 bg-[#F6F6F3] px-3 py-2">
          <ChevronLeft className="h-4 w-4 text-muted" aria-hidden />
          <span className="grid h-8 w-8 place-items-center rounded-full bg-green text-[11px] font-bold text-white">{school.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
          <span className="flex min-w-0 flex-col leading-tight">
            <b className="truncate text-[12.5px] font-semibold text-ink">{school}</b>
            <span className="text-[10.5px] text-muted-2">{scene === "typing" ? "typing…" : "School office"}</span>
          </span>
        </div>

        <div className="chat relative flex-1 overflow-hidden px-3 py-3">
          <span className="mx-auto mb-3 block w-fit rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-muted-2">Today</span>

          {scene === "typing" ? (
            <div className="bubble feed-in w-fit px-3 py-2.5"><span className="typing" aria-hidden><i /><i /><i /></span></div>
          ) : (
            <div key={student.id} className="bubble feed-in max-w-[86%] px-3 py-2 text-[12px] leading-snug text-ink-2">
              <p>Namaste {parent} ji. Under India's new data protection law, we need your consent to keep {child}'s school records. It takes under a minute.</p>
              <p lang="hi" className="mt-1.5 text-[11.5px] text-muted">कृपया नीचे दिए लिंक से सहमति दें।</p>
              <span className={`link-card mt-2 block rounded-md border border-black/5 bg-[#F3F7F4] px-2.5 py-2 ${scene === "message" ? "tap-target" : ""}`}>
                <b className="block text-[11.5px] font-semibold text-green">Consent for {child} · {clsName(student.cls)}</b>
                <span className="block text-[10.5px] text-muted-2">sahmati.in/c/{student.id}</span>
              </span>
              <span className="mt-1 block text-right text-[9.5px] text-muted-3">10:24 ✓✓</span>
            </div>
          )}

          {shown(["consent", "otp", "done"]) && (
            <div className="sheet absolute inset-x-0 bottom-0 top-6 flex flex-col rounded-t-[18px] bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(15,20,18,0.12)]">
              <span className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-2" />

              {scene === "consent" && (
                <div key="consent" className="feed-in flex flex-1 flex-col gap-2.5">
                  <b className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-ink">Consent for {child}'s data</b>
                  <span className="text-[11px] text-muted-2">{school} · notice v2</span>
                  {([["School records", "Required to study at the school", true, false], ["Photos on the school website", "Optional", photos, true], ["Newsletter and events", "Optional", !photos, false]] as const).map(([label, sub, on, anim]) => (
                    <span key={label} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                      <span className="flex flex-col"><b className="text-[12px] font-semibold text-ink">{label}</b><span className="text-[10.5px] text-muted-2">{sub}</span></span>
                      <Switch on={on} animate={anim && on} />
                    </span>
                  ))}
                  <span className="press mt-auto rounded-lg bg-brand py-2.5 text-center text-[12.5px] font-bold text-brand-ink">Continue</span>
                </div>
              )}

              {scene === "otp" && (
                <div key="otp" className="feed-in flex flex-1 flex-col gap-3">
                  <b className="text-[15px] font-semibold leading-tight text-ink">Confirm it's you</b>
                  <span className="text-[11.5px] text-muted">Enter the 6-digit code sent to {maskPhone(student.phone)}</span>
                  <span className="flex justify-between gap-1.5">
                    {"482917".split("").map((d, i) => (
                      <span key={i} className="otp-box grid h-10 flex-1 place-items-center rounded-md border border-line-2 text-[16px] font-semibold tabular-nums text-ink" style={{ animationDelay: `${150 + i * 120}ms` }}>{d}</span>
                    ))}
                  </span>
                  <span className="press press-late mt-auto rounded-lg bg-brand py-2.5 text-center text-[12.5px] font-bold text-brand-ink">Give consent</span>
                </div>
              )}

              {scene === "done" && (
                <div key="done" className="flex flex-1 flex-col items-center gap-2 pt-1 text-center">
                  <span className="pop grid h-12 w-12 place-items-center rounded-full bg-green-soft"><Check className="h-6 w-6 text-green" strokeWidth={2.8} /></span>
                  <b className="feed-in text-[15.5px] font-semibold text-ink">Consent recorded</b>
                  <span className="feed-in text-[11.5px] leading-snug text-muted">Thank you, {parent} ji. Change or withdraw it anytime from the same link.</span>
                  <ul className="feed-in mt-1 w-full divide-y divide-line rounded-lg border border-line text-left" style={{ animationDelay: "120ms" }}>
                    {([["School records", true], ["Photos on the website", photos], ["Newsletter and events", !photos]] as const).map(([label, on]) => (
                      <li key={label} className="flex items-center justify-between px-3 py-1.5 text-[11.5px]">
                        <span className="text-ink-2">{label}</span>
                        <span className={on ? "font-semibold text-green" : "text-muted-3"}>{on ? "Yes" : "No"}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="receipt-slip feed-in mt-1 w-full px-3 pb-2.5 pt-3 text-left" style={{ animationDelay: "240ms" }}>
                    <span className="flex items-baseline justify-between">
                      <span className="text-[10.5px] text-muted-2">Receipt</span>
                      <span className="text-[10px] text-muted-2">10:24 IST</span>
                    </span>
                    <b className="block font-mono text-[14px] font-semibold tracking-[0.02em] text-ink">{sampleReceipt(student, n)}</b>
                    <span className="mt-1 flex items-center gap-1 text-[10.5px] text-green"><ShieldCheck className="h-3 w-3" />Check it at sahmati.in/verify</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
