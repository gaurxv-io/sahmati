import { appUrl } from "./base";
import { MSG, fill } from "./i18n";
import type { Breach, DB, ParentRequest, Role, Student } from "./types";

export const ROLES: Record<Role, { label: string; desc: string }> = {
  principal: { label: "Principal", desc: "Admin: everything, including team and settings" },
  office: { label: "Office", desc: "Students, parent requests, consent drives and data packs" },
  teacher: { label: "Teacher", desc: "Read-only, their own classes only" },
  auditor: { label: "Auditor", desc: "Read-only everything, no exports of personal data" },
};
export const roleLabel = (r: string, classes: string[] = []) => (ROLES[r as Role]?.label ?? r) + (r === "teacher" && classes.length ? ` · Class ${classes.join(", ")}` : "");
/** What the current person may do. The database enforces the same rules. */
export const can = (db: DB) => {
  const r = db.me.role;
  return { write: r === "principal" || r === "office", admin: r === "principal", export: r === "principal" || r === "office", log: r === "principal" || r === "auditor" };
};

export const BREACH_STEPS = [
  ["Contain the leak", "Stop access, change passwords"],
  ["Inform the Data Protection Board", "Initial intimation"],
  ["Notify affected parents", "Plain-language message to each family"],
  ["Send the detailed report to the Board", "Within 72 hours of discovery"],
  ["Fix the cause", "Close the gap that let it happen"],
  ["Close the incident", "Record the outcome"],
] as const;
export const BREACH_DATA = ["Names and classes", "Contact numbers", "Addresses", "Marks and attendance", "Medical notes", "Photos"] as const;
export const BREACH_CAUSES = ["Lost or stolen device", "Sent to the wrong person", "Vendor or app leak", "Hacked account", "Other"] as const;
export const breachDeadline = (b: Breach) => Date.parse(b.discoveredAt) + 72 * 3600000;
/** Open breach whose 72-hour detailed report (step 4) is still not sent after the deadline. */
export const breachOverdue = (b: Breach, at = Date.now()) => b.status === "open" && !b.steps[3] && at > breachDeadline(b);

export const DEADLINE = Date.parse("2027-05-13T00:00:00+05:30");
export const RULES_NOTIFIED = Date.parse("2025-11-13T00:00:00+05:30");
export const SLA_DAYS = 7;
export const BANDS = ["Nursery – UKG", "Class 1 – 5", "Class 6 – 8", "Class 9 – 12"] as const;
export const CLASS_ORDER = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const TZ = { timeZone: "Asia/Kolkata" } as const;
export const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, ...TZ });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...TZ });
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", ...TZ });
export const maskPhone = (p: string) => `+91 ${p.slice(0, 2)}XXX X${p.slice(-4)}`;
export const daysLeft = () => Math.max(0, Math.ceil((DEADLINE - Date.now()) / 86400000));
export const elapsed = () => Math.min(1, Math.max(0, (Date.now() - RULES_NOTIFIED) / (DEADLINE - RULES_NOTIFIED)));
export const band = (cls: string) => (["Nursery", "LKG", "UKG"].includes(cls) ? BANDS[0] : +cls <= 5 ? BANDS[1] : +cls <= 8 ? BANDS[2] : BANDS[3]);
export const clsLabel = (s: Pick<Student, "cls" | "sec">) => `${/^\d+$/.test(s.cls) ? "Class " + s.cls : s.cls}-${s.sec}`;
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export const isLate = (r: ParentRequest) => r.status === "open" && Date.now() - Date.parse(r.createdAt) > SLA_DAYS * 86400000;
export const dueDate = (r: ParentRequest) => new Date(Date.parse(r.createdAt) + SLA_DAYS * 86400000).toISOString();

export function sortedStudents(db: DB) {
  return Object.values(db.students).sort((a, b) => CLASS_ORDER.indexOf(a.cls) - CLASS_ORDER.indexOf(b.cls) || a.sec.localeCompare(b.sec) || a.name.localeCompare(b.name));
}
export const sortedRequests = (db: DB) => Object.values(db.requests).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

export function consentLink(sid: string) { return appUrl(`/c/${sid}`); }
export function waMessage(db: DB, s: Student, reminder = false) {
  const m = MSG[s.lang] ?? MSG.en;
  return (reminder ? m.waRemind : "") + fill(m.wa, { parent: s.parent, school: db.school.name, student: s.name, link: consentLink(s.id) });
}
export const waHref = (db: DB, s: Student, reminder = false) => `https://wa.me/91${s.phone}?text=${encodeURIComponent(waMessage(db, s, reminder))}`;

export function stats(db: DB) {
  const list = sortedStudents(db);
  const total = list.length;
  const given = list.filter((s) => s.status === "given").length;
  const withdrawn = list.filter((s) => s.status === "withdrawn").length;
  const renewal = list.filter((s) => s.status === "renewal").length;
  const pending = total - given - withdrawn - renewal;
  const cov = total ? (given + withdrawn + renewal) / total : 0;
  const bands = BANDS.map((name) => {
    const inB = list.filter((s) => band(s.cls) === name);
    const done = inB.filter((s) => s.status !== "pending").length;
    return { name, total: inB.length, done, pct: inB.length ? done / inB.length : 0 };
  });
  const reqs = sortedRequests(db);
  const open = reqs.filter((r) => r.status === "open").length;
  const late = reqs.filter(isLate).length;
  const sent = db.events.some((e) => e.type === "sent" || e.type === "drive");
  const breaches = db.breaches ?? [];
  const openBreaches = breaches.filter((b) => b.status === "open").length;
  const overdueBreaches = breaches.filter((b) => breachOverdue(b)).length;
  const vendors = db.vendors ?? [];
  const unsigned = vendors.filter((v) => v.dpa !== "signed").length;
  const checks = [
    { ok: !!db.school.noticeVersion, title: "Privacy notice published", detail: db.school.noticeVersion ? `Notice ${db.school.noticeVersion} · English, Hindi` : "Not published" },
    { ok: sent, title: "Consent drive running on WhatsApp", detail: sent ? "Links sent to parents" : "No links sent yet" },
    { ok: cov >= 0.9, title: "Consent recorded for 90% of students", detail: `${Math.round(cov * 100)}% recorded` },
    { ok: late === 0, title: `Parent requests answered in ${SLA_DAYS} days`, detail: late ? `${late} overdue` : `${open} open · none overdue` },
    { ok: db.school.breachPlan, title: "72-hour breach plan on file", detail: db.school.breachPlan ? "Filed" : "Not filed", action: "breach" as const },
    { ok: !overdueBreaches, title: "No open breach past 72 hours", detail: overdueBreaches ? `${overdueBreaches} overdue` : `${openBreaches} open · none overdue` },
    { ok: vendors.length > 0 && unsigned === 0, title: "Every vendor has a signed DPA", detail: vendors.length ? (unsigned ? `${unsigned} of ${vendors.length} not signed` : `${vendors.length} of ${vendors.length} signed`) : "No vendors listed" },
    { ok: (db.staff ?? []).some((m) => m.role !== "principal"), title: "Staff access limited by role", detail: staffDetail(db) },
  ];
  return { renewal, total, given, withdrawn, pending, cov, bands, open, late, reqs: reqs.length, checks, ready: checks.filter((c) => c.ok).length, openBreaches, overdueBreaches, unsignedVendors: unsigned };
}

function staffDetail(db: DB) {
  const staff = db.staff ?? [];
  const other = staff.filter((m) => m.role !== "principal").length;
  return other ? `${staff.length} people · own logins · ${other} with limited roles` : staff.length ? "Everyone has full access" : "No team set up";
}
/** Students who consented to an older notice version than the current one. */
export const olderNotice = (db: DB) => Object.values(db.students).filter((s) => (s.status === "given" || s.status === "withdrawn") && (s.noticeAt ?? "") !== db.school.noticeVersion);
export const packLink = (token: string) => appUrl(`/p/${token}`);
export const publicLink = (slug: string) => appUrl(`/s/${slug}`);

/** Weekly principal summary, shared by the Overview card, WhatsApp share and the Monday email. */
export function digest(db: DB, now = Date.now()) {
  const st = stats(db);
  const week = now - 7 * 86400000;
  const newConsents = db.events.filter((e) => e.type === "consent" && Date.parse(e.ts) >= week).length;
  const open = sortedRequests(db).filter((r) => r.status === "open");
  const dueSoon = open.filter((r) => !isLate(r) && Date.parse(dueDate(r)) - now < 3 * 86400000).length;
  const next = st.overdueBreaches ? "File the detailed breach report with the Board today."
    : st.openBreaches ? "Finish the open breach response steps."
    : st.late ? `Answer the ${st.late} overdue parent request${st.late > 1 ? "s" : ""}.`
    : st.pending + st.renewal > 0 ? `Send WhatsApp reminders to the ${st.pending + st.renewal} parents still pending.`
    : st.checks.find((c) => !c.ok)?.title.replace(/^/, "Complete: ") ?? "Keep going. Every step is met.";
  const lines = [
    { k: "New consents this week", v: String(newConsents) },
    { k: "Still pending", v: String(st.pending + st.renewal) },
    { k: "Requests due or overdue", v: `${dueSoon} due · ${st.late} overdue` },
    { k: "Open breaches", v: String(st.openBreaches) },
    { k: "Readiness", v: `${st.ready} of ${st.checks.length} steps` },
    { k: "Days to the deadline", v: String(daysLeft()) },
  ];
  const text = `${db.school.name} · Sahmati weekly summary\n\n` + lines.map((l) => `${l.k}: ${l.v}`).join("\n") + `\n\nNext: ${next}`;
  return { lines, next, text };
}
