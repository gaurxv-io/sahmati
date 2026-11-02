import type { DB, LedgerEvent, ParentRequest, Student } from "./types";
import { sha256 } from "./hash";

/** Builds the sample school (30 students) used for demos. Deterministic, so every reset looks the same. */
export async function buildSampleDB(): Promise<DB> {
  const first = ["Aarav", "Ananya", "Vihaan", "Diya", "Kabir", "Ira", "Arjun", "Saanvi", "Reyansh", "Myra", "Ayaan", "Kiara", "Ishaan", "Aadhya", "Rudra", "Pari", "Dhruv", "Anika", "Vivaan", "Navya", "Krish", "Riya", "Atharv", "Sara", "Shaurya", "Meera", "Advik", "Tara", "Yash", "Zoya"];
  const last = ["Sharma", "Verma", "Singh", "Gupta", "Kumar", "Yadav", "Mishra", "Pandey", "Jha", "Sinha", "Agarwal", "Chauhan", "Khan", "Das", "Rao"];
  const parents = ["Sunita", "Rajesh", "Pooja", "Amit", "Neha", "Sanjay", "Kavita", "Vikas", "Anjali", "Manoj", "Rekha", "Deepak", "Priya", "Suresh", "Meena"];
  const classes = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let t = Date.parse("2026-10-20T09:00:00+05:30");
  const tick = (min: number) => { t += min * 60000; return new Date(t).toISOString(); };

  const students: Student[] = [];
  const raw: Omit<LedgerEvent, "seq" | "prev" | "hash">[] = [];
  raw.push({ type: "notice", sid: "-", detail: "Privacy notice v2 published (EN, HI)", ts: tick(0) });
  raw.push({ type: "drive", sid: "-", detail: "Consent drive started for 30 students", ts: tick(15) });

  for (let i = 0; i < 30; i++) {
    rnd();
    const id = "s" + String(i + 1).padStart(3, "0");
    const ln = last[i % last.length];
    const s: Student = {
      id, name: `${first[i]} ${ln}`, cls: classes[i % classes.length], sec: i % 2 ? "B" : "A",
      parent: `${parents[(i * 7) % parents.length]} ${ln}`, phone: "90000" + String(10101 + i * 37).slice(-5),
      lang: i % 3 === 0 ? "hi" : "en", status: "pending", choices: { records: true, web: false, newsletter: false },
      sentAt: tick(4 + Math.floor(rnd() * 20)), consentAt: null, receipt: null,
    };
    raw.push({ type: "sent", sid: id, detail: "Consent link sent on WhatsApp", ts: s.sentAt! });
    students.push(s);
  }
  students.forEach((s, i) => {
    const willGive = i === 13 || (rnd() < 0.7 && i % 5 !== 2);
    if (!willGive) return;
    s.status = "given";
    s.choices = { records: true, web: rnd() < 0.6, newsletter: rnd() < 0.75 };
    s.consentAt = tick(30 + Math.floor(rnd() * 400));
    s.receipt = `SAH-${s.id.slice(1)}-${s.cls.replace(/[^0-9A-Z]/gi, "").slice(0, 3).toUpperCase()}${s.sec}`;
    raw.push({ type: "consent", sid: s.id, detail: `Consent given, verified by OTP · records yes, web ${s.choices.web ? "yes" : "no"}, newsletter ${s.choices.newsletter ? "yes" : "no"}`, ts: s.consentAt });
  });
  const w = students[13];
  w.status = "withdrawn";
  w.choices = { records: true, web: false, newsletter: false };
  raw.push({ type: "withdraw", sid: w.id, detail: "Optional consents withdrawn by parent", ts: tick(240) });
  raw.push({ type: "remind", sid: "-", detail: "Reminder sent to pending parents", ts: tick(60) });

  const requests: ParentRequest[] = [
    { id: "r001", sid: "s004", type: "access", note: "Please share what data you hold on my son.", createdAt: tick(30), status: "open" },
    { id: "r002", sid: "s009", type: "correct", note: "Address has changed to Sector 21, Dwarka.", createdAt: tick(45), status: "open" },
    { id: "r003", sid: "s021", type: "delete", note: "Remove old bus app photo.", createdAt: tick(20), status: "done" },
  ];
  requests.forEach((r) => raw.push({ type: "request", sid: r.sid, detail: `Parent request: ${r.type}`, ts: r.createdAt }));
  raw.sort((a, b) => (a.ts < b.ts ? -1 : 1));

  const events: LedgerEvent[] = [];
  let prev = "GENESIS";
  for (let i = 0; i < raw.length; i++) {
    const e = { ...raw[i], seq: i + 1, prev } as LedgerEvent;
    e.hash = await sha256(chainString(prev, e));
    prev = e.hash;
    events.push(e);
  }

  return {
    school: { name: "Green Valley Public School", city: "New Delhi", slug: "greenvalley", noticeVersion: "v2", breachPlan: false, dpo: "Mrs. R. Kapoor, Vice Principal" },
    students: Object.fromEntries(students.map((s) => [s.id, s])),
    requests: Object.fromEntries(requests.map((r) => [r.id, r])),
    events,
    leads: [],
  };
}

/** The exact string each ledger hash covers: previous hash + the record's fields. */
export function chainString(prev: string, e: Pick<LedgerEvent, "seq" | "ts" | "type" | "sid" | "detail">): string {
  return [prev, e.seq, e.ts, e.type, e.sid, e.detail].join("|");
}
