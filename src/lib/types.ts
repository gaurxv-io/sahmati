export type ConsentStatus = "pending" | "given" | "withdrawn" | "renewal";
export type Lang = "en" | "hi" | "mr" | "ta" | "bn" | "gu" | "kn" | "te";

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
  /** Assisted consent from a signed paper form: private scan path and its SHA-256. */
  paper?: boolean;
  paperFile?: string | null;
  paperHash?: string | null;
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
  languages?: Lang[];
  groupId?: string | null;
  isDemo?: boolean;
  digestEmail?: boolean;
  digestEmailTo?: string;
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
  /** Published notice text for the current version, per language. */
  notice?: NoticeContent | null;
};

export const NOTICE_SECTIONS = [["collect", "What we collect"], ["why", "Why"], ["share", "Who we share it with"], ["keep", "How long we keep it"], ["rights", "Your rights"], ["contact", "How to contact us"], ["withdraw", "How to withdraw consent"]] as const;
export type NoticeSection = (typeof NOTICE_SECTIONS)[number][0];
export type NoticeContent = Partial<Record<Lang, Record<NoticeSection, string>>>;

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
