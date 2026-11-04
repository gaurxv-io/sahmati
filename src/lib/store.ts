import { useSyncExternalStore } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { NoticeContent, Lang, AccessRow, Breach, DB, Lead, Vendor, LedgerEvent, ParentRequest, RequestType, Role, School, Student } from "./types";
import { chainString } from "./sample";
import { sha256 } from "./hash";
import { BREACH_STEPS } from "./derive";
import { toast } from "@/components/toast";
/** Result of asking for a parent OTP. `code` is set only for demo schools, which show it on screen. */
export type SendCodeResult = { ok: true; code?: string } | { ok: false; error: "invalid" | "rate" | "sms" };

/**
 * Data store backed by Supabase. Public API (useDB, actions.*, verifyLedger) is unchanged.
 * Scope is chosen from the current path and the signed-in user:
 *  - /c/:sid           -> parent view of one student (server functions only)
 *  - /app* signed in   -> the user's own school (or the "Create your school" step)
 *  - everything else   -> the demo school (Green Valley), open to everyone
 * Ledger rows are only ever written by database functions, which compute seq/prev/hash.
 */
export type Mode = "demo" | "live" | "parent";
export type StoreState = {
  status: "loading" | "ready" | "error" | "onboard";
  mode: Mode;
  db: DB | null;
  user: User | null;
  error?: string | undefined;
};

let state: StoreState = { status: "loading", mode: "demo", db: null, user: null };
let schoolId: string | null = null;
let parentSid: string | null = null;
let path = "/";
let scopeKey = "";
let token = 0;
let channel: RealtimeChannel | null = null;
let started = false;
let refetchTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<StoreState>) { state = { ...state, ...patch }; listeners.forEach((l) => l()); }
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function useDB(): DB | null {
  return useSyncExternalStore(subscribe, () => (state.status === "ready" ? state.db : null), () => null);
}
export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export async function initStore() {
  if (started || typeof window === "undefined") return;
  started = true;
  const { data } = await supabase.auth.getUser();
  state = { ...state, user: data.user ?? null };
  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    const next = session?.user ?? null;
    if (next?.id === state.user?.id && event !== "USER_UPDATED") return;
    set({ user: next });
    scopeKey = "";
    void resolve();
  });
  await resolve();
}

/** Called by the root on every navigation. */
export function setRoute(p: string) {
  path = p;
  if (started) void resolve();
}

/** Opens another school's console (group view, or a group admin switching schools). */
export function openSchool(slug: string) {
  window.sessionStorage.setItem("sahmati.school", slug);
  scopeKey = "";
  void resolve();
}

export function retry() { scopeKey = ""; void resolve(); }

async function resolve() {
  const parent = path.match(/^\/c\/([^/]+)/);
  const wantsApp = path === "/app" || path.startsWith("/app/") || path === "/group";
  const pick = typeof window !== "undefined" ? window.sessionStorage.getItem("sahmati.school") ?? "" : "";
  let key: string;
  if (parent) key = `parent:${decodeURIComponent(parent[1])}`;
  else if (wantsApp && state.user) key = `user:${state.user.id}:${pick}`;
  else key = `demo:${pick}`;
  if (key === scopeKey) return;
  scopeKey = key;
  const my = ++token;
  teardown();
  set({ status: "loading", db: null, error: undefined });
  try {
    if (parent) {
      parentSid = decodeURIComponent(parent[1]);
      schoolId = null;
      const db = await loadParent(parentSid);
      if (my !== token) return;
      set({ status: "ready", mode: "parent", db });
      return;
    }
    parentSid = null;
    let id: string | null;
    let mode: Mode;
    const picked = pick ? (await supabase.from("schools").select("id,is_demo").eq("slug", pick).maybeSingle()).data : null;
    if (key.startsWith("user:")) {
      const { data, error } = await supabase.from("school_staff").select("school_id").eq("user_id", state.user!.id).maybeSingle();
      if (error) throw error;
      let mine = picked && !picked.is_demo ? picked.id : data?.school_id ?? null;
      if (!mine) {
        // Group admins without their own school open the first school in their group.
        const ga = await supabase.from("group_admins").select("group_id").eq("user_id", state.user!.id).limit(1).maybeSingle();
        if (ga.data) mine = (await supabase.from("schools").select("id").eq("group_id", ga.data.group_id).order("name").limit(1).maybeSingle()).data?.id ?? null;
      }
      if (!mine) {
        // Invited staff join their school on first sign-in.
        const inv = await supabase.rpc("accept_invite");
        if (inv.error) throw inv.error;
        mine = (inv.data as string | null) ?? null;
      }
      if (my !== token) return;
      if (!mine) { schoolId = null; set({ status: "onboard", mode: "live", db: null }); return; }
      id = mine; mode = "live";
    } else {
      if (picked?.is_demo) { id = picked.id; } else {
        const { data, error } = await supabase.from("schools").select("id").eq("slug", "greenvalley").maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Demo school is missing");
        id = data.id;
      }
      mode = "demo";
    }
    schoolId = id;
    const db = await loadSchool(id);
    if (my !== token) return;
    set({ status: "ready", mode, db });
    listen(id);
  } catch (e) {
    if (my !== token) return;
    console.error(e);
    scopeKey = "";
    set({ status: "error", db: null, error: e instanceof Error ? e.message : String(e) });
  }
}

function teardown() {
  if (channel) { void supabase.removeChannel(channel); channel = null; }
  if (refetchTimer) { clearTimeout(refetchTimer); refetchTimer = null; }
}

function listen(id: string) {
  const ch = supabase.channel(`school-${id}-${Math.random().toString(36).slice(2)}`);
  for (const table of ["students", "ledger", "requests", "breaches", "vendors", "school_staff", "staff_invites", "access_log", "packs", "notices"] as const) {
    ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `school_id=eq.${id}` }, scheduleRefetch);
  }
  ch.on("postgres_changes", { event: "*", schema: "public", table: "schools", filter: `id=eq.${id}` }, scheduleRefetch);
  channel = ch.subscribe();
}

function scheduleRefetch() {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => { refetchTimer = null; void refetch(); }, 250);
}

async function refetch() {
  const my = token;
  try {
    if (parentSid) { const db = await loadParent(parentSid); if (my === token) set({ db }); return; }
    if (!schoolId) return;
    const db = await loadSchool(schoolId);
    if (my === token) set({ db, status: "ready" });
  } catch (e) { console.error(e); }
}

/* ---------- loading ---------- */

async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

const iso = (v: string | null) => (v ? new Date(v).toISOString() : null);

type StudentRow = { id: string; name: string; cls: string; sec: string; parent: string; phone: string; lang: string; status: string; choices: unknown; sent_at: string | null; consent_at: string | null; receipt: string | null; created_at?: string | null; consent_notice?: string | null; paper?: boolean | null; paper_file?: string | null; paper_hash?: string | null };
const toStudent = (r: StudentRow): Student => ({
  id: r.id, name: r.name, cls: r.cls, sec: r.sec, parent: r.parent, phone: r.phone, lang: r.lang as Student["lang"],
  status: r.status as Student["status"], choices: r.choices as Student["choices"], sentAt: iso(r.sent_at), consentAt: iso(r.consent_at), receipt: r.receipt,
  ...(r.created_at ? { createdAt: iso(r.created_at)! } : {}), noticeAt: r.consent_notice ?? null,
  paper: !!r.paper, paperFile: r.paper_file ?? null, paperHash: r.paper_hash ?? null,
});
const toEvent = (r: { seq: number; ts: string; type: string; sid: string; detail: string; prev: string; hash: string }): LedgerEvent => ({
  seq: r.seq, ts: r.ts, type: r.type as LedgerEvent["type"], sid: r.sid, detail: r.detail, prev: r.prev, hash: r.hash,
});

async function loadSchool(id: string): Promise<DB> {
  const uid = state.user?.id ?? null;
  const [school, students, events, requests, breaches, vendors, leads, staff, invites, access, packs] = await Promise.all([
    supabase.from("schools").select("*").eq("id", id).single(),
    all((a, b) => supabase.from("students").select("*").eq("school_id", id).order("id").range(a, b)),
    all((a, b) => supabase.from("ledger").select("seq,ts,type,sid,detail,prev,hash").eq("school_id", id).order("seq").range(a, b)),
    all((a, b) => supabase.from("requests").select("*").eq("school_id", id).order("created_at").range(a, b)),
    supabase.from("breaches").select("*").eq("school_id", id).order("created_at"),
    supabase.from("vendors").select("*").eq("school_id", id).order("id"),
    uid ? supabase.from("leads").select("*").order("at") : Promise.resolve({ data: [] as never[] }),
    supabase.from("school_staff").select("*").eq("school_id", id).order("created_at"),
    supabase.from("staff_invites").select("*").eq("school_id", id).order("created_at"),
    supabase.from("access_log").select("*").eq("school_id", id).order("at", { ascending: false }).limit(1000),
    supabase.from("packs").select("id,sid,created_at,expires_at,revoked_at,created_by").eq("school_id", id).order("created_at", { ascending: false }),
  ]);
  const notice = school.data ? (await supabase.from("notices").select("content").eq("school_id", id).eq("version", school.data.notice_version).maybeSingle()).data : null;
  if (school.error) throw school.error;
  if (breaches.error) throw breaches.error;
  if (vendors.error) throw vendors.error;
  const s = school.data;
  const team = (staff.data ?? []).map((m) => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role as Role, classes: m.classes ?? [], createdAt: iso(m.created_at)! }));
  const self = s.is_demo ? null : team.find((m) => m.userId === uid);
  return {
    me: self ? { role: self.role, name: self.name || self.email, classes: self.classes } : { role: "principal", name: "Principal's office", classes: [] },
    staff: team,
    invites: (invites.data ?? []).map((i) => ({ email: i.email, name: i.name, role: i.role as Role, classes: i.classes ?? [], createdAt: iso(i.created_at)! })),
    access: (access.data ?? []).map((a) => ({ id: a.id, at: iso(a.at)!, actor: a.actor, role: a.role, action: a.action as AccessRow["action"], sid: a.sid, detail: a.detail })),
    packs: (packs.data ?? []).map((p) => ({ id: p.id, sid: p.sid, createdAt: iso(p.created_at)!, expiresAt: iso(p.expires_at)!, revokedAt: iso(p.revoked_at), createdBy: p.created_by })),
    school: { name: s.name, city: s.city, slug: s.slug, noticeVersion: s.notice_version, breachPlan: s.breach_plan, dpo: s.dpo, languages: (s.languages ?? ["en", "hi"]) as Lang[], groupId: s.group_id, isDemo: s.is_demo, digestEmail: s.digest_email, digestEmailTo: s.digest_email_to },
    notice: (notice?.content as NoticeContent | undefined) ?? null,
    students: Object.fromEntries(students.map((r) => [r.id, toStudent(r)])),
    requests: Object.fromEntries(requests.map((r) => [r.id, { id: r.id, sid: r.sid, type: r.type as RequestType, note: r.note, createdAt: iso(r.created_at)!, status: r.status as ParentRequest["status"], ...(r.done_at ? { doneAt: iso(r.done_at)! } : {}) }])),
    events: events.map(toEvent),
    leads: (leads.data ?? []).map((l) => ({ name: l.name, role: l.role, school: l.school, city: l.city, phone: l.phone, size: l.size, at: iso(l.at)!, ...(l.score != null ? { score: l.score } : {}), ...(l.gaps ? { gaps: l.gaps as string[] } : {}) })),
    breaches: breaches.data.map((b) => ({ id: b.id, what: b.what, discoveredAt: iso(b.discovered_at)!, data: b.data as string[], count: b.count, cause: b.cause, createdAt: iso(b.created_at)!, steps: b.steps as (string | null)[], status: b.status as Breach["status"] })),
    vendors: vendors.data.map((v) => ({ id: v.id, name: v.name, role: v.role, data: v.data as string[], dpa: v.dpa as Vendor["dpa"], signedAt: iso(v.signed_at), review: iso(v.review) })),
  };
}

type ParentView = { school: { name: string; city: string; slug: string; noticeVersion: string; languages: Lang[]; dpo: string }; notice: NoticeContent | null; student: StudentRow & { consentAt: string | null }; event: Parameters<typeof toEvent>[0] | null } | null;

async function loadParent(sid: string): Promise<DB> {
  const { data, error } = await supabase.rpc("parent_view", { _sid: sid });
  if (error) throw error;
  const v = data as unknown as ParentView;
  const base: DB = { school: { name: "Sahmati", city: "", slug: "app", noticeVersion: "v1", breachPlan: false, dpo: "" }, students: {}, requests: {}, events: [], leads: [], breaches: [], vendors: [], staff: [], invites: [], access: [], packs: [], me: { role: "principal", name: "", classes: [] } };
  if (!v) return base;
  const st = v.student;
  return {
    ...base,
    school: { ...base.school, ...v.school },
    notice: v.notice,
    students: { [st.id]: toStudent({ ...st, sent_at: null, consent_at: st.consentAt }) },
    events: v.event ? [toEvent(v.event)] : [],
  };
}

/* ---------- writes ---------- */

type Ev = [LedgerEvent["type"], string, string];
const now = () => new Date().toISOString();

function fail(e: unknown): never {
  const msg = (e as { message?: string })?.message ?? String(e);
  toast(msg.length < 140 ? msg : "Couldn't save. Check your connection and try again.");
  throw e instanceof Error ? e : new Error(msg);
}
const ok = <T,>(r: { data: T; error: unknown }) => { if (r.error) fail(r.error); return r.data; };

async function append(events: Ev[]): Promise<LedgerEvent[]> {
  const r = await supabase.rpc("append_events", { _school: schoolId!, _events: events.map(([type, sid, detail]) => ({ type, sid, detail })) });
  return (ok(r) ?? []).map(toEvent);
}

/** Runs a write, then refreshes immediately (realtime also refreshes other devices). Errors are shown as a toast. */
async function write<T>(fn: () => Promise<T>): Promise<T> {
  try { const out = await fn(); await refetch(); return out; }
  catch (e) { if (!(e instanceof Error && e.message)) toast("Couldn't save. Check your connection and try again."); throw e; }
}
const db = () => state.db!;

export const actions = {
  markSent: (sid: string) => write(async () => {
    ok(await supabase.from("students").update({ sent_at: now() }).eq("id", sid));
    return append([["sent", sid, "Consent link sent on WhatsApp"]]);
  }),
  remindPending: () => write(async () => {
    const pending = Object.values(db().students).filter((s) => s.status === "pending" || s.status === "renewal").map((s) => s.id);
    if (pending.length) ok(await supabase.from("students").update({ sent_at: now() }).in("id", pending));
    return append([["remind", "-", `Reminder sent to ${pending.length} pending parents`]]);
  }),
  /** Parent consent: validated and written by the server in one step. */
  /** Asks the server for a code. Demo school (or no SMS provider): the code comes back to show on screen. */
  sendCode: async (sid: string): Promise<SendCodeResult> => {
    // The database issues the code (demo schools only); real schools need an SMS sender.
    const { data, error } = await supabase.rpc("otp_request", { _sid: sid });
    if (error) throw error;
    return data as SendCodeResult;
  },
  /** Returns the ledger event, or an error key: bad | locked | expired | nocode | invalid. Never throws for a wrong code. */
  giveConsent: async (sid: string, choices: Student["choices"], code: string): Promise<{ ok: true; event: LedgerEvent } | { ok: false; error: string }> => {
    const r = await supabase.rpc("give_consent", { _sid: sid, _web: choices.web, _newsletter: choices.newsletter, _code: code });
    if (r.error) fail(r.error);
    const v = r.data as unknown as { ok: boolean; error?: string; event?: Parameters<typeof toEvent>[0] };
    if (!v.ok) return { ok: false, error: v.error ?? "invalid" };
    await refetch();
    return { ok: true, event: toEvent(v.event!) };
  },
  addRequest: (sid: string, type: RequestType, note: string) => write(async () => {
    ok(await supabase.rpc("parent_request", { _sid: sid, _type: type, _note: note }));
  }),
  resolveRequest: (rid: string) => write(async () => {
    const r = db().requests[rid];
    ok(await supabase.from("requests").update({ status: "done", done_at: now() }).eq("school_id", schoolId!).eq("id", rid));
    return append([["resolved", r.sid, `Parent request resolved: ${r.type}`]]);
  }),
  fileBreachPlan: () => write(async () => {
    ok(await supabase.from("schools").update({ breach_plan: true }).eq("id", schoolId!));
    return append([["plan", "-", "72-hour breach response plan filed"]]);
  }),
  publishNotice: () => write(async () => {
    const v = "v" + (parseInt(db().school.noticeVersion.replace(/\D/g, "") || "0", 10) + 1);
    ok(await supabase.from("schools").update({ notice_version: v }).eq("id", schoolId!));
    return append([["notice", "-", `Privacy notice ${v} published (EN, HI)`]]);
  }),
  updateSchool: (patch: Partial<School>) => write(async () => {
    const row: { name?: string; city?: string; dpo?: string } = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.city !== undefined) row.city = patch.city;
    if (patch.dpo !== undefined) row.dpo = patch.dpo;
    ok(await supabase.from("schools").update(row).eq("id", schoolId!));
  }),
  importStudents: (rows: Omit<Student, "id" | "status" | "choices" | "sentAt" | "consentAt" | "receipt">[]) => write(async () => {
    ok(await supabase.rpc("import_students", { _school: schoolId!, _rows: rows }));
  }),
  addLead: async (lead: Omit<Lead, "at">) => {
    const r = await supabase.from("leads").insert({ name: lead.name, role: lead.role, school: lead.school, city: lead.city, phone: lead.phone, size: lead.size, score: lead.score ?? null, gaps: lead.gaps ?? null });
    if (r.error) fail(r.error);
    if (schoolId) await refetch();
  },
  reportBreach: (b: Omit<Breach, "id" | "createdAt" | "steps" | "status">) => write(async () => {
    const id = "b" + String(Date.now()).slice(-6);
    ok(await supabase.from("breaches").insert({ school_id: schoolId!, id, what: b.what, discovered_at: b.discoveredAt, data: b.data, count: b.count, cause: b.cause, steps: BREACH_STEPS.map(() => null), status: "open" }));
    await append([["breach", "-", `Data breach logged · ${b.cause} · about ${b.count} students`]]);
    return id;
  }),
  breachStep: (id: string, i: number) => write(async () => {
    const b = db().breaches.find((x) => x.id === id)!;
    const steps = b.steps.slice(); steps[i] = now();
    ok(await supabase.from("breaches").update({ steps, status: steps.every(Boolean) ? "closed" : "open" }).eq("school_id", schoolId!).eq("id", id));
    return append([["breachstep", "-", `Breach ${id.toUpperCase()}: ${BREACH_STEPS[i][0]} done`]]);
  }),
  addVendor: (v: Omit<Vendor, "id">) => write(async () => {
    ok(await supabase.from("vendors").insert({ school_id: schoolId!, id: "v" + String(Date.now()).slice(-6), name: v.name, role: v.role, data: v.data, dpa: v.dpa, signed_at: v.signedAt, review: v.review }));
    return append([["vendor", "-", `Vendor added: ${v.name} · DPA ${v.dpa}`]]);
  }),
  signDpa: (id: string) => write(async () => {
    const v = db().vendors.find((x) => x.id === id)!;
    ok(await supabase.from("vendors").update({ dpa: "signed", signed_at: now(), review: new Date(Date.now() + 365 * 86400000).toISOString() }).eq("school_id", schoolId!).eq("id", id));
    return append([["vendor", "-", `DPA signed with ${v.name}`]]);
  }),
  /**
   * Demo only: the stored ledger is append-only, so this edits this screen's copy of a past
   * record without re-hashing, to show Verify chain catching it. The next refresh restores it.
   */
  tamper: async () => {
    const next: DB = JSON.parse(JSON.stringify(state.db));
    const e = next.events[Math.floor(next.events.length / 2)];
    e.detail = e.detail.replace("web no", "web yes") + " ";
    set({ db: next });
    return e.seq;
  },
  /** Marks the chosen parents "Renewal pending". Returns how many parents will be asked. */
  startRenewal: (kind: "year" | "admissions" | "notice", since?: string) => write(async () => {
    return ok(await supabase.rpc("start_renewal", { _school: schoolId!, _kind: kind, _since: since ?? null as unknown as string })) as number;
  }),
  /** Creates a private 7-day link; the token is only ever returned here. */
  createPack: (sid: string) => write(async () => {
    return ok(await supabase.rpc("create_pack", { _school: schoolId!, _sid: sid })) as unknown as { id: string; token: string; expiresAt: string };
  }),
  revokePack: (id: string) => write(async () => { ok(await supabase.rpc("revoke_pack", { _school: schoolId!, _id: id })); }),
  inviteStaff: (f: { email: string; name: string; role: Role; classes: string[] }) => write(async () => {
    ok(await supabase.rpc("invite_staff", { _school: schoolId!, _email: f.email, _name: f.name, _role: f.role, _classes: f.classes }));
  }),
  cancelInvite: (email: string) => write(async () => { ok(await supabase.rpc("cancel_invite", { _school: schoolId!, _email: email })); }),
  setStaffRole: (userId: string, role: Role, classes: string[]) => write(async () => {
    ok(await supabase.rpc("set_staff_role", { _school: schoolId!, _user: userId, _role: role, _classes: classes }));
  }),
  removeStaff: (userId: string) => write(async () => { ok(await supabase.rpc("remove_staff", { _school: schoolId!, _user: userId })); }),
  /** Access log: views and exports. Changes are logged by the database itself. */
  logAccess: (action: "view" | "export", sid: string, detail: string) => {
    if (!schoolId || state.mode === "parent") return;
    void supabase.rpc("log_access", { _school: schoolId, _action: action, _sid: sid, _detail: detail }).then(({ error }) => { if (error) console.error(error); });
  },
  publishNoticeContent: (content: NoticeContent) => write(async () => ok(await supabase.rpc("publish_notice", { _school: schoolId!, _content: content as never })) as string),
  setLanguages: (langs: Lang[]) => write(async () => { ok(await supabase.rpc("set_languages", { _school: schoolId!, _langs: langs })); }),
  setDigest: (on: boolean, to: string) => write(async () => { ok(await supabase.rpc("set_digest", { _school: schoolId!, _on: on, _to: to })); }),
  /** Uploads the signed form to the private bucket, then records consent with the file's SHA-256 in the ledger. */
  recordPaper: (f: { sid: string; file: File; web: boolean; newsletter: boolean; witness: string; date: string }) => write(async () => {
    const buf = await f.file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buf))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const ext = (f.file.name.split(".").pop() || "pdf").toLowerCase();
    const path = `${schoolId}/${f.sid}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("paper-consents").upload(path, f.file, { contentType: f.file.type, upsert: false });
    if (up.error) fail(up.error);
    ok(await supabase.rpc("record_paper_consent", { _school: schoolId!, _sid: f.sid, _web: f.web, _newsletter: f.newsletter, _witness: f.witness, _date: f.date, _file: path, _hash: hash }));
    return hash;
  }),
  paperUrl: async (path: string) => {
    const r = await supabase.storage.from("paper-consents").createSignedUrl(path, 300);
    if (r.error) fail(r.error);
    actions.logAccess("view", path.split("/")[1]?.split("-")[0] ?? "-", "Viewed paper consent scan");
    return r.data!.signedUrl;
  },
  createGroup: (name: string) => write(async () => { ok(await supabase.rpc("create_group", { _school: schoolId!, _name: name })); }),
  joinGroup: (code: string) => write(async () => { ok(await supabase.rpc("join_group", { _school: schoolId!, _code: code })); }),
  reset: () => write(async () => {
    if (state.mode !== "demo") return;
    ok(await supabase.rpc("reset_demo"));
  }),
};

/** "Create your school" after first sign-in. */
export async function createSchool(f: { name: string; city: string; slug: string; dpo: string }) {
  const r = await supabase.rpc("create_school", { _name: f.name, _city: f.city, _slug: f.slug, _dpo: f.dpo });
  if (r.error) throw new Error(r.error.message);
  scopeKey = "";
  await resolve();
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Public receipt check: only that receipt's record and whether the school's chain verifies. */
export async function checkReceipt(receipt: string): Promise<{ school: string; student: Pick<Student, "name" | "cls" | "sec" | "receipt">; event: LedgerEvent | null; chainOk: boolean } | null> {
  const { data, error } = await supabase.rpc("verify_receipt", { _receipt: receipt });
  if (error) throw error;
  const v = data as unknown as { school: string; student: Pick<Student, "name" | "cls" | "sec" | "receipt">; event: Parameters<typeof toEvent>[0] | null; chainOk: boolean } | null;
  return v ? { ...v, event: v.event ? toEvent(v.event) : null } : null;
}

export async function verifyLedger(events: LedgerEvent[]): Promise<{ ok: true; count: number } | { ok: false; seq: number }> {
  let prev = "GENESIS";
  for (const e of events) {
    const h = await sha256(chainString(prev, e));
    if (e.prev !== prev || h !== e.hash) return { ok: false, seq: e.seq };
    prev = e.hash;
  }
  return { ok: true, count: events.length };
}

export type PackData = {
  createdAt: string; expiresAt: string;
  school: { name: string; city: string; slug: string; noticeVersion: string; dpo: string };
  student: Student;
  events: LedgerEvent[];
  requests: ParentRequest[];
  vendors: Vendor[];
};

/** Parent's private data pack link. Returns "expired" for revoked, expired or unknown links. */
export async function loadPack(token: string): Promise<PackData | "expired"> {
  const { data, error } = await supabase.rpc("pack_view", { _token: token });
  if (error) throw error;
  const v = data as unknown as { ok: boolean; createdAt: string; expiresAt: string; school: PackData["school"]; student: StudentRow & { consentAt: string | null; noticeAt: string | null }; events: Parameters<typeof toEvent>[0][]; requests: { id: string; sid: string; type: string; note: string; createdAt: string; status: string; doneAt: string | null }[]; vendors: { id: string; name: string; role: string; data: string[]; dpa: string; signedAt: string | null; review: string | null }[] };
  if (!v.ok) return "expired";
  return {
    createdAt: v.createdAt, expiresAt: v.expiresAt, school: v.school,
    student: toStudent({ ...v.student, sent_at: null, consent_at: v.student.consentAt, consent_notice: v.student.noticeAt }),
    events: v.events.map(toEvent),
    requests: v.requests.map((r) => ({ id: r.id, sid: r.sid, type: r.type as RequestType, note: r.note, createdAt: iso(r.createdAt)!, status: r.status as ParentRequest["status"], ...(r.doneAt ? { doneAt: iso(r.doneAt)! } : {}) })),
    vendors: v.vendors.map((x) => ({ id: x.id, name: x.name, role: x.role, data: x.data, dpa: x.dpa as Vendor["dpa"], signedAt: iso(x.signedAt), review: iso(x.review) })),
  };
}

export type PublicSchool = { name: string; city: string; slug: string; dpo: string; noticeVersion: string; updatedAt: string | null; checks: { title: string; ok: boolean }[] };
export async function loadPublicSchool(slug: string): Promise<PublicSchool | null> {
  const { data, error } = await supabase.rpc("public_school", { _slug: slug });
  if (error) throw error;
  return (data as unknown as PublicSchool) ?? null;
}

export type GroupRow = { id: string; name: string; slug: string; city: string; students: number; recorded: number; pending: number; openRequests: number; overdue: number; openBreaches: number; met: number; steps: number; lastActivity: string | null };
export async function loadGroup(groupId: string): Promise<{ name: string; joinCode: string | null; schools: GroupRow[] }> {
  const { data, error } = await supabase.rpc("group_overview", { _group: groupId });
  if (error) throw error;
  return data as unknown as { name: string; joinCode: string | null; schools: GroupRow[] };
}
