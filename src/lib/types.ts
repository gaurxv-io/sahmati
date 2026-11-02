export type ConsentStatus = "pending" | "given" | "withdrawn" | "renewal";
export type Lang = "en" | "hi";

export type Choices = { records: true; web: boolean; newsletter: boolean };

export type Student = {
  id: string;
  name: string;
  cls: string;
  sec: string;
  parent: string;
  phone: string;
  lang: Lang;
  status: ConsentStatus;
  choices: Choices;
  sentAt: string | null;
  consentAt: string | null;
  receipt: string | null;
  /** When the student was added, and the notice version the parent last consented to. */
  createdAt?: string;
  noticeAt?: string | null;
};

export type LedgerEvent = {
  seq: number;
  ts: string;
  type: "notice" | "drive" | "sent" | "remind" | "consent" | "update" | "withdraw" | "request" | "resolved" | "plan" | "import" | "breach" | "breachstep" | "vendor" | "team" | "pack";
  sid: string;
  detail: string;
  prev: string;
  hash: string;
};

export type RequestType = "access" | "correct" | "delete";
export type ParentRequest = {
  id: string;
  sid: string;
  type: RequestType;
  note: string;
  createdAt: string;
  status: "open" | "done";
  doneAt?: string;
};

export type School = {
  name: string;
  city: string;
  slug: string;
  noticeVersion: string;
  breachPlan: boolean;
  dpo: string;
};

export type Lead = { name: string; role: string; school: string; city: string; phone: string; size: string; at: string; score?: number; gaps?: string[] };

export type DB = {
  school: School;
  students: Record<string, Student>;
  events: LedgerEvent[];
  requests: Record<string, ParentRequest>;
  leads: Lead[];
  breaches: Breach[];
  vendors: Vendor[];
  staff: Staff[];
  invites: Invite[];
  access: AccessRow[];
  packs: Pack[];
  /** The person using the console and what their role allows. */
  me: { role: Role; name: string; classes: string[] };
};

export type Role = "principal" | "office" | "teacher" | "auditor";
export type Staff = { userId: string; name: string; email: string; role: Role; classes: string[]; createdAt: string };
export type Invite = { email: string; name: string; role: Role; classes: string[]; createdAt: string };
export type AccessRow = { id: number; at: string; actor: string; role: string; action: "view" | "export" | "change"; sid: string; detail: string };
export type Pack = { id: string; sid: string; createdAt: string; expiresAt: string; revokedAt: string | null; createdBy: string };

export type Breach = {
  id: string;
  what: string;
  discoveredAt: string;
  data: string[];
  count: number;
  cause: string;
  createdAt: string;
  /** Done-at time for each of the 6 response steps, or null. */
  steps: (string | null)[];
  status: "open" | "closed";
};

export type DpaStatus = "signed" | "sent" | "missing";
export type Vendor = { id: string; name: string; role: string; data: string[]; dpa: DpaStatus; signedAt: string | null; review: string | null };
