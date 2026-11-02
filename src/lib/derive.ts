import type { DB, ParentRequest, Student } from "./types";

export const DEADLINE = Date.parse("2027-05-13T00:00:00+05:30");
export const RULES_NOTIFIED = Date.parse("2025-11-13T00:00:00+05:30");
export const SLA_DAYS = 7;
export const BANDS = ["Nursery – UKG", "Class 1 – 5", "Class 6 – 8", "Class 9 – 12"] as const;
const CLASS_ORDER = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const TZ = { timeZone: "Asia/Kolkata" } as const;
export const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, ...TZ });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...TZ });
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", ...TZ });
export const maskPhone = (p: string) => `+91 ${p.slice(0, 2)}XXX X${p.slice(-4)}`;
export const daysLeft = () => Math.max(0, Math.ceil((DEADLINE - Date.now()) / 86400000));
export const elapsed = () => Math.min(1, Math.max(0, (Date.now() - RULES_NOTIFIED) / (DEADLINE - RULES_NOTIFIED)));
export const band = (cls: string) => (["Nursery", "LKG", "UKG"].includes(cls) ? BANDS[0] : +cls <= 5 ? BANDS[1] : +cls <= 8 ? BANDS[2] : BANDS[3]);
export const clsLabel = (s: Student) => `${/^\d+$/.test(s.cls) ? "Class " + s.cls : s.cls}-${s.sec}`;
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export const isLate = (r: ParentRequest) => r.status === "open" && Date.now() - Date.parse(r.createdAt) > SLA_DAYS * 86400000;
export const dueDate = (r: ParentRequest) => new Date(Date.parse(r.createdAt) + SLA_DAYS * 86400000).toISOString();

export function sortedStudents(db: DB) {
  return Object.values(db.students).sort((a, b) => CLASS_ORDER.indexOf(a.cls) - CLASS_ORDER.indexOf(b.cls) || a.sec.localeCompare(b.sec) || a.name.localeCompare(b.name));
}
export const sortedRequests = (db: DB) => Object.values(db.requests).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

export function consentLink(sid: string) { return `${window.location.origin}/c/${sid}`; }
export function waMessage(db: DB, s: Student, reminder = false) {
  const link = consentLink(s.id);
  if (s.lang === "hi") return `${reminder ? "याद दिलाना: " : ""}नमस्ते ${s.parent} जी, ${db.school.name} डेटा सुरक्षा कानून (DPDP) के तहत ${s.name} के डेटा के लिए आपकी सहमति ले रहा है। इसमें 1 मिनट लगता है और यह मुफ़्त है: ${link}`;
  return `${reminder ? "Reminder: " : ""}Namaste ${s.parent}, ${db.school.name} is collecting your consent for ${s.name}'s data under India's DPDP Act. It takes one minute and is free: ${link}`;
}
export const waHref = (db: DB, s: Student, reminder = false) => `https://wa.me/91${s.phone}?text=${encodeURIComponent(waMessage(db, s, reminder))}`;

export function stats(db: DB) {
  const list = sortedStudents(db);
  const total = list.length;
  const given = list.filter((s) => s.status === "given").length;
  const withdrawn = list.filter((s) => s.status === "withdrawn").length;
  const pending = total - given - withdrawn;
  const cov = total ? (given + withdrawn) / total : 0;
  const bands = BANDS.map((name) => {
    const inB = list.filter((s) => band(s.cls) === name);
    const done = inB.filter((s) => s.status !== "pending").length;
    return { name, total: inB.length, done, pct: inB.length ? done / inB.length : 0 };
  });
  const reqs = sortedRequests(db);
  const open = reqs.filter((r) => r.status === "open").length;
  const late = reqs.filter(isLate).length;
  const sent = db.events.some((e) => e.type === "sent" || e.type === "drive");
  const checks = [
    { ok: !!db.school.noticeVersion, title: "Privacy notice published", detail: db.school.noticeVersion ? `Notice ${db.school.noticeVersion} · English, Hindi` : "Not published" },
    { ok: sent, title: "Consent drive running on WhatsApp", detail: sent ? "Links sent to parents" : "No links sent yet" },
    { ok: cov >= 0.9, title: "Consent recorded for 90% of students", detail: `${Math.round(cov * 100)}% recorded` },
    { ok: late === 0, title: `Parent requests answered in ${SLA_DAYS} days`, detail: late ? `${late} overdue` : `${open} open · none overdue` },
    { ok: db.school.breachPlan, title: "72-hour breach plan on file", detail: db.school.breachPlan ? "Filed" : "Not filed", action: "breach" as const },
  ];
  return { total, given, withdrawn, pending, cov, bands, open, late, reqs: reqs.length, checks, ready: checks.filter((c) => c.ok).length };
}
