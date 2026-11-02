import { useSyncExternalStore } from "react";
import type { DB, Lead, LedgerEvent, ParentRequest, RequestType, School, Student } from "./types";
import { buildSampleDB, chainString } from "./sample";
import { sha256 } from "./hash";

/**
 * Demo data store. Persists to localStorage and syncs across tabs, so the school console
 * and a parent consent link open in another tab update each other live.
 * Swap this module for Supabase (see supabase/schema.sql) to go multi-device.
 */
const KEY = "sahmati-demo-v1";
let db: DB | null = null;
const listeners = new Set<() => void>();
let queue: Promise<unknown> = Promise.resolve();
let started = false;

function emit() { listeners.forEach((l) => l()); }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable: keep in memory */ } }
function load(): DB | null { try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as DB) : null; } catch { return null; } }

export async function initStore() {
  if (started || typeof window === "undefined") return;
  started = true;
  db = load();
  if (!db) { db = await buildSampleDB(); persist(); }
  emit();
  window.addEventListener("storage", (e) => { if (e.key === KEY) { db = load(); emit(); } });
}

export function useDB(): DB | null {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => db, () => null);
}

function commit(next: DB) { db = next; persist(); emit(); }
function run<T>(fn: () => Promise<T>): Promise<T> { const p = queue.then(fn); queue = p.catch(() => undefined); return p; }

async function appendEvent(cur: DB, type: LedgerEvent["type"], sid: string, detail: string): Promise<LedgerEvent> {
  const last = cur.events[cur.events.length - 1];
  const e: LedgerEvent = { seq: last ? last.seq + 1 : 1, ts: new Date().toISOString(), type, sid, detail, prev: last ? last.hash : "GENESIS", hash: "" };
  e.hash = await sha256(chainString(e.prev, e));
  return e;
}

async function mutate(fn: (d: DB) => void, events: [LedgerEvent["type"], string, string][]) {
  return run(async () => {
    const next: DB = JSON.parse(JSON.stringify(db));
    fn(next);
    const added: LedgerEvent[] = [];
    for (const [type, sid, detail] of events) { const e = await appendEvent(next, type, sid, detail); next.events.push(e); added.push(e); }
    commit(next);
    return added;
  });
}

const now = () => new Date().toISOString();
const choicesText = (c: Student["choices"]) => `records yes, web ${c.web ? "yes" : "no"}, newsletter ${c.newsletter ? "yes" : "no"}`;

export const actions = {
  markSent: (sid: string) => mutate((d) => { d.students[sid].sentAt = now(); }, [["sent", sid, "Consent link sent on WhatsApp"]]),
  remindPending: () => {
    const pending = Object.values(db!.students).filter((s) => s.status === "pending");
    return mutate((d) => { pending.forEach((s) => { d.students[s.id].sentAt = now(); }); }, [["remind", "-", `Reminder sent to ${pending.length} pending parents`]]);
  },
  giveConsent: async (sid: string, choices: Student["choices"]) => {
    const was = db!.students[sid].status !== "pending";
    const added = await mutate((d) => {
      const s = d.students[sid];
      s.choices = choices;
      s.status = was && !choices.web && !choices.newsletter ? "withdrawn" : "given";
      s.consentAt = now();
      s.receipt = s.receipt || `SAH-${s.id.slice(1)}-${String(Date.now()).slice(-4)}`;
    }, [[was ? "update" : "consent", sid, `${was ? "Consent updated" : "Consent given"}, verified by OTP · ${choicesText(choices)}`]]);
    return added[0];
  },
  addRequest: (sid: string, type: RequestType, note: string) => {
    const r: ParentRequest = { id: "r" + String(Date.now()).slice(-7), sid, type, note, createdAt: now(), status: "open" };
    return mutate((d) => { d.requests[r.id] = r; }, [["request", sid, `Parent request: ${type}`]]);
  },
  resolveRequest: (rid: string) => {
    const r = db!.requests[rid];
    return mutate((d) => { d.requests[rid].status = "done"; d.requests[rid].doneAt = now(); }, [["resolved", r.sid, `Parent request resolved: ${r.type}`]]);
  },
  fileBreachPlan: () => mutate((d) => { d.school.breachPlan = true; }, [["plan", "-", "72-hour breach response plan filed"]]),
  publishNotice: () => {
    const v = "v" + (parseInt(db!.school.noticeVersion.replace(/\D/g, "") || "0", 10) + 1);
    return mutate((d) => { d.school.noticeVersion = v; }, [["notice", "-", `Privacy notice ${v} published (EN, HI)`]]);
  },
  updateSchool: (patch: Partial<School>) => run(async () => { const next: DB = JSON.parse(JSON.stringify(db)); next.school = { ...next.school, ...patch }; commit(next); }),
  importStudents: (rows: Omit<Student, "id" | "status" | "choices" | "sentAt" | "consentAt" | "receipt">[]) => {
    const n = Object.keys(db!.students).length;
    return mutate((d) => {
      rows.forEach((r, i) => {
        const id = "s" + String(n + i + 1).padStart(3, "0");
        d.students[id] = { ...r, id, status: "pending", choices: { records: true, web: false, newsletter: false }, sentAt: null, consentAt: null, receipt: null };
      });
    }, [["import", "-", `${rows.length} students imported from spreadsheet`]]);
  },
  addLead: (lead: Omit<Lead, "at">) => run(async () => { const next: DB = JSON.parse(JSON.stringify(db)); next.leads.push({ ...lead, at: now() }); commit(next); }),
  /** Demo only: edits a past record without re-hashing, to show the chain catching it. */
  tamper: () => run(async () => { const next: DB = JSON.parse(JSON.stringify(db)); const e = next.events[Math.floor(next.events.length / 2)]; e.detail = e.detail.replace("web no", "web yes") + " "; commit(next); return e.seq; }),
  reset: () => run(async () => { commit(await buildSampleDB()); }),
};

export async function verifyLedger(events: LedgerEvent[]): Promise<{ ok: true; count: number } | { ok: false; seq: number }> {
  let prev = "GENESIS";
  for (const e of events) {
    const h = await sha256(chainString(prev, e));
    if (e.prev !== prev || h !== e.hash) return { ok: false, seq: e.seq };
    prev = e.hash;
  }
  return { ok: true, count: events.length };
}
