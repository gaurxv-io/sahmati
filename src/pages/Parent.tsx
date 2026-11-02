import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { Crest } from "@/components/brand";
import { actions, useDB } from "@/lib/store";
import { clsLabel, fmtTime, maskPhone } from "@/lib/derive";
import type { Lang, RequestType } from "@/lib/types";

const T = {
  en: { step: "01 · Parent consent", title: "Consent for your child's data", keeps: "What the school keeps", keepsV: "Name, class, photo, address, parent contact, marks, attendance and medical notes.", why: "Why", whyV: "Teaching, report cards, school transport, and contacting you in an emergency.", notice: "Read the full privacy notice", choices: "Your choices", rec: "Education and school records", web: "Photos on school website and social media", news: "Event photos in the school newsletter", required: "REQUIRED", optional: "OPTIONAL", verify: "Verify it's you", sentTo: "6-digit code sent to", sendCode: "Send code to", demo: "Prototype: no SMS is sent. Your code is", give: "Give consent · free", update: "Save changes", bad: "That code doesn't match. Check the code and try again.", locked: "Too many wrong tries. This code no longer works. Request a new code.", expired: "This code has expired. Request a new code.", rate: "Too many codes requested. Try again in an hour.", sms: "We couldn't send the SMS. Try again in a minute.", newCode: "Request a new code", recorded: "Consent recorded", copy: "A copy has been sent to your WhatsApp.", receipt: "Receipt", student: "Student", by: "Given by", time: "Time", verified: "Verified", noticeV: "Notice", yes: "YES", no: "NO", change: "Change or withdraw", ask: "Ask about my child's data", reqType: "What do you need?", access: "See my child's data", correct: "Correct something", del: "Delete something", note: "Details (optional)", sendReq: "Send request", sentReq: "Request sent. The school will reply within 7 days.", proof: "Proof", check: "Check this receipt", free: "Consent is always free. Change or withdraw it anytime from this same link.", invalid: "This consent link isn't valid. Ask the school office to send a fresh link." },
  hi: { step: "01 · अभिभावक सहमति", title: "आपके बच्चे के डेटा के लिए सहमति", keeps: "स्कूल क्या रखता है", keepsV: "नाम, कक्षा, फ़ोटो, पता, अभिभावक संपर्क, अंक, उपस्थिति और स्वास्थ्य संबंधी जानकारी।", why: "क्यों", whyV: "पढ़ाई, रिपोर्ट कार्ड, स्कूल बस, और आपात स्थिति में आपसे संपर्क के लिए।", notice: "पूरी गोपनीयता सूचना पढ़ें", choices: "आपकी पसंद", rec: "शिक्षा और स्कूल रिकॉर्ड", web: "स्कूल वेबसाइट और सोशल मीडिया पर फ़ोटो", news: "स्कूल न्यूज़लेटर में कार्यक्रम की फ़ोटो", required: "ज़रूरी", optional: "वैकल्पिक", verify: "पुष्टि करें कि यह आप हैं", sentTo: "6 अंकों का कोड भेजा गया", sendCode: "कोड भेजें", demo: "प्रोटोटाइप: कोई SMS नहीं भेजा जाता। आपका कोड है", give: "सहमति दें · मुफ़्त", update: "बदलाव सहेजें", bad: "कोड मेल नहीं खाता। फिर से देखें।", locked: "बहुत बार गलत कोड डाला गया। यह कोड अब काम नहीं करेगा। नया कोड मँगाएँ।", expired: "इस कोड की समय-सीमा खत्म हो गई है। नया कोड मँगाएँ।", rate: "बहुत ज़्यादा कोड मँगाए गए। एक घंटे बाद फिर कोशिश करें।", sms: "SMS नहीं भेजा जा सका। एक मिनट बाद फिर कोशिश करें।", newCode: "नया कोड मँगाएँ", recorded: "सहमति दर्ज हो गई", copy: "इसकी कॉपी आपके WhatsApp पर भेज दी गई है।", receipt: "रसीद", student: "छात्र", by: "सहमति दी", time: "समय", verified: "पुष्टि", noticeV: "सूचना", yes: "हाँ", no: "नहीं", change: "बदलें या वापस लें", ask: "बच्चे के डेटा के बारे में पूछें", reqType: "आपको क्या चाहिए?", access: "बच्चे का डेटा देखना", correct: "कुछ सुधारना", del: "कुछ हटाना", note: "विवरण (वैकल्पिक)", sendReq: "अनुरोध भेजें", sentReq: "अनुरोध भेज दिया गया। स्कूल 7 दिनों में जवाब देगा।", proof: "प्रमाण", check: "रसीद जाँचें", free: "सहमति हमेशा मुफ़्त है। इसी लिंक से कभी भी बदलें या वापस लें।", invalid: "यह लिंक मान्य नहीं है। स्कूल से नया लिंक माँगें।" },
};

export default function Parent() {
  const { sid = "" } = useParams({ strict: false }) as { sid?: string };
  const db = useDB()!;
  const s = db.students[sid];
  const [lang, setLang] = useState<Lang>(s?.lang ?? "en");
  const [editing, setEditing] = useState(false);
  const [web, setWeb] = useState(s?.choices.web ?? false);
  const [news, setNews] = useState(s?.choices.newsletter ?? false);
  const [code, setCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [dead, setDead] = useState(false);
  const requestCode = async () => {
    setErr(""); setDead(false); setOtp("");
    try {
      const r = await actions.sendCode(sid);
      if (r.ok) setCode(r.code ?? ""); else setErr(r.error === "rate" ? t.rate : r.error === "sms" ? t.sms : t.invalid);
    } catch { setErr(t.sms); }
  };
  const [asking, setAsking] = useState(false);
  const [reqType, setReqType] = useState<RequestType>("access");
  const [reqNote, setReqNote] = useState("");
  const [reqSent, setReqSent] = useState(false);
  const t = T[lang];

  const header = (
    <>
      <div className="bg-ink text-[12.5px] text-white">
        <div className="mx-auto flex max-w-[460px] items-center justify-between gap-2.5 px-4 py-2">
          <span className="font-mono text-[11px] tracking-[0.06em]">PARENT VIEW · WHAT {(s?.parent.split(" ")[0] ?? "THE PARENT").toUpperCase()} SEES ON WHATSAPP</span>
          <Link to="/app/students" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-hover"><ArrowLeft className="h-3.5 w-3.5" />Console</Link>
        </div>
      </div>
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[460px] items-center gap-2.5 px-4 py-3.5">
          <Crest name={db.school.name} />
          <div><div className="text-sm font-semibold">{db.school.name}</div><div className="font-mono text-[11px] text-muted-2">{db.school.slug}.sahmati.in</div></div>
        </div>
      </div>
    </>
  );

  if (!s) return <div className="min-h-screen">{header}<div className="mx-auto max-w-[460px] px-4 pt-5"><div className="rounded-xl border border-line bg-white p-4 text-ink-2">{t.invalid}</div></div></div>;

  const done = s.status !== "pending" && !editing;
  const lastEvent = db.events.filter((e) => e.sid === sid && ["consent", "update", "withdraw"].includes(e.type)).pop();
  const yn = (v: boolean) => <span className={`font-mono text-xs ${v ? "text-green" : "text-muted-2"}`}>{v ? t.yes : t.no}</span>;

  const submit = async () => {
    const r = await actions.giveConsent(sid, { records: true, web, newsletter: news }, otp.trim());
    if (!r.ok) {
      if (r.error === "bad") { setErr(t.bad); return; }
      setErr(r.error === "expired" ? t.expired : t.locked); setDead(true); return;
    }
    setEditing(false); setCode(null); setOtp(""); setErr(""); setDead(false); window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen pb-10">
      {header}
      <div className="mx-auto flex max-w-[460px] flex-col gap-4 px-4 pt-[18px]" lang={lang}>
        <div role="group" aria-label="Language" className="flex gap-[3px] rounded-lg border border-line bg-canvas p-[3px]">
          {(["en", "hi"] as const).map((l) => (
            <button key={l} lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={`min-h-10 flex-1 rounded-md text-sm ${lang === l ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(15,20,18,0.08)]" : "text-muted"} ${l === "hi" ? "font-hi" : ""}`}>{l === "en" ? "English" : "हिंदी"}</button>
          ))}
        </div>

        {done ? (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="grid justify-items-start gap-2.5 border-b border-dashed border-line-2 px-[18px] py-[22px]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-green-soft"><Check className="h-[22px] w-[22px] text-green" strokeWidth={2.4} /></span>
              <h1 className="text-[22px] font-semibold tracking-[-0.03em]">{t.recorded}</h1>
              <p className="text-sm text-muted">{t.copy}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 px-[18px] py-4 text-[13px]">
              {([[t.receipt, <span className="font-mono">#{s.receipt}</span>], [t.student, `${s.name} · ${clsLabel(s)}`], [t.by, s.parent], [t.time, <span className="font-mono">{s.consentAt && fmtTime(s.consentAt)}</span>], [t.verified, <span className="font-mono">OTP · {maskPhone(s.phone)}</span>], [t.noticeV, <span className="font-mono">{db.school.noticeVersion} · {lang.toUpperCase()}</span>], [t.rec, yn(true)], [t.web, yn(s.choices.web)], [t.news, yn(s.choices.newsletter)], [t.proof, <span className="font-mono text-[11.5px] text-muted-2">{lastEvent?.hash.slice(0, 16)}…</span>]] as const).map(([k, v], i) => (
                <div key={i} className="contents"><dt className="text-muted-2">{k}</dt><dd className="m-0 break-words text-right text-ink">{v}</dd></div>
              ))}
            </dl>
            <div className="grid gap-2.5 border-t border-line bg-canvas px-[18px] py-3.5">
              <button className="btn" onClick={() => { setEditing(true); setWeb(s.choices.web); setNews(s.choices.newsletter); }}>{t.change}</button>
              <button className="btn btn-ghost" onClick={() => setAsking(!asking)}>{t.ask}</button>
              <Link to="/verify/$receipt" params={{ receipt: s.receipt ?? "" }} className="text-center text-[13px] font-semibold">{t.check}</Link>
              {reqSent && <p className="flex items-center gap-2 rounded-lg border border-dashed border-line-2 bg-subtle px-3 py-2.5 text-[13px] text-ink-2"><Check className="h-4 w-4 text-green" />{t.sentReq}</p>}
              {asking && (
                <div className="grid gap-2">
                  <label className="eyebrow" htmlFor="rq-type">{t.reqType}</label>
                  <select id="rq-type" className="field min-h-10" value={reqType} onChange={(e) => setReqType(e.target.value as RequestType)}><option value="access">{t.access}</option><option value="correct">{t.correct}</option><option value="delete">{t.del}</option></select>
                  <label className="eyebrow" htmlFor="rq-note">{t.note}</label>
                  <textarea id="rq-note" rows={3} className="field py-2" value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
                  <button className="btn btn-primary" onClick={async () => { await actions.addRequest(sid, reqType, reqNote.trim()); setAsking(false); setReqNote(""); setReqSent(true); }}>{t.sendReq}</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-2.5">
              <span className="eyebrow">{t.step}</span>
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{t.title}</h1>
              <div className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5 text-sm"><b className="font-semibold">{s.name}</b><span className="font-mono text-xs text-muted-2">{clsLabel(s)}</span></div>
            </div>
            <div className="grid gap-2 rounded-[10px] border border-line bg-white p-4">
              <span className="eyebrow">{t.keeps}</span><span className="text-sm text-ink-2">{t.keepsV}</span>
              <span className="eyebrow mt-1">{t.why}</span><span className="text-sm text-ink-2">{t.whyV}</span>
              <a href="#notice" className="text-sm font-semibold">{t.notice}</a>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-[15px] font-semibold">{t.choices}<span className="font-mono text-[11px] font-normal text-muted-2">02</span></div>
              {([[t.rec, true, true, () => {}], [t.web, web, false, () => setWeb(!web)], [t.news, news, false, () => setNews(!news)]] as const).map(([label, val, req, toggle], i) => (
                <label key={i} className={`flex items-start gap-3 rounded-[10px] border border-line bg-white px-4 py-3.5 ${req ? "" : "cursor-pointer"}`}>
                  <input id={`c-${i}`} type="checkbox" checked={val} disabled={req} onChange={toggle} className="mt-px h-5 w-5 shrink-0 accent-green" />
                  <span className="flex flex-col gap-0.5 text-sm font-semibold">{label}<span className="font-mono text-[11px] font-normal text-muted-2">{req ? t.required : t.optional}</span></span>
                </label>
              ))}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-[15px] font-semibold">{t.verify}<span className="font-mono text-[11px] font-normal text-muted-2">03</span></div>
              {code !== null ? (
                <>
                  <div className="text-[13px] text-muted-2">{t.sentTo} <span className="font-mono text-ink-2">{maskPhone(s.phone)}</span></div>
                  {code && <div className="flex items-center gap-2 rounded-lg border border-dashed border-line-2 bg-subtle px-3 py-2.5 text-[13px] text-ink-2">{t.demo} <b className="font-mono tracking-[0.15em] text-ink">{code}</b></div>}
                  <input id="otp" aria-label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="– – – – – –" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="field min-h-[52px] w-full text-center font-mono text-xl tracking-[0.45em]" />
                  {err && <p className="text-[13px] text-danger">{err}</p>}
                  {dead ? <button className="btn btn-lg w-full text-base" onClick={requestCode}>{t.newCode}</button> : <button className="btn btn-primary btn-lg w-full text-base" onClick={submit}>{editing ? t.update : t.give}</button>}
                </>
              ) : (
                <>
                  {err && <p className="text-[13px] text-danger">{err}</p>}
                  <button className="btn btn-primary btn-lg w-full text-base" onClick={requestCode}>{t.sendCode} {maskPhone(s.phone)}</button>
                </>
              )}
            </div>
          </>
        )}
        <div className="grid gap-1.5 text-center text-xs text-muted-2">
          <span>{t.free}</span>
          <span className="font-mono text-[11px]">ENCRYPTED · DATA REGION MUMBAI · POWERED BY SAHMATI</span>
        </div>
      </div>
    </div>
  );
}
