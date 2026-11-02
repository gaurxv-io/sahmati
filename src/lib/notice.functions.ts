import { createServerFn } from "@tanstack/react-start";
import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";

const SECTIONS = ["collect", "why", "share", "keep", "rights", "contact", "withdraw"] as const;
const NAMES: Record<string, string> = { en: "English", hi: "Hindi", mr: "Marathi", ta: "Tamil", bn: "Bengali", gu: "Gujarati", kn: "Kannada", te: "Telugu" };

export type NoticeInput = { school: string; city: string; collect: string; purposes: string; vendors: string; retention: string; contact: string; languages: string[] };
export type NoticeDraft = { ok: true; content: Record<string, Record<(typeof SECTIONS)[number], string>> } | { ok: false; error: string };

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

/** Drafts a plain-language DPDP privacy notice with Lovable AI. Staff review and publish it themselves. */
export const draftNotice = createServerFn({ method: "POST" })
  .inputValidator((d: NoticeInput): NoticeInput => ({
    school: clip(d?.school, 120), city: clip(d?.city, 80), collect: clip(d?.collect, 1500), purposes: clip(d?.purposes, 1500),
    vendors: clip(d?.vendors, 1500), retention: clip(d?.retention, 300), contact: clip(d?.contact, 200),
    languages: Array.isArray(d?.languages) ? d.languages.filter((l) => l in NAMES).slice(0, 8) : ["en"],
  }))
  .handler(async ({ data }): Promise<NoticeDraft> => {
    const langs = Array.from(new Set(["en", ...data.languages]));
    const prompt = `Write a privacy notice for parents at ${data.school}${data.city ? `, ${data.city}` : ""}, an Indian school, under India's Digital Personal Data Protection Act 2023.
Plain, warm language a parent with basic schooling understands. Short sentences. No legal jargon, no markdown, no emoji. Do not invent facts beyond what is given.
Facts from the school:
- Data collected: ${data.collect}
- Purposes: ${data.purposes}
- Shared with (vendors): ${data.vendors || "none listed"}
- Retention: ${data.retention}
- Data protection contact: ${data.contact}
Sections, 1 to 4 sentences each: collect (What we collect), why (Why), share (Who we share it with), keep (How long we keep it), rights (Your rights: see, correct, delete, grievance, reply within 7 days, complain to the Data Protection Board), contact (How to contact us), withdraw (How to withdraw consent: free, same link, as easy as giving it; school records stay as needed to run the school).
Languages: ${langs.map((l) => `${l} = ${NAMES[l]}`).join(", ")}. Each language is a natural translation of the English, not a summary.
Return JSON: {"<language code>": {"collect": "...", "why": "...", "share": "...", "keep": "...", "rights": "...", "contact": "...", "withdraw": "..."}} with one key per language code.`;
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        text: { format: { type: "json_object" } },
        input: [{ role: "user", content: prompt }],
      });
      const out = (res as unknown as { output?: { content?: { type: string; text?: string }[] }[] }).output ?? [];
      const text = out.flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
      const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>;
      const content: Record<string, Record<(typeof SECTIONS)[number], string>> = {};
      for (const l of langs) {
        const v = parsed[l];
        if (!v) continue;
        content[l] = Object.fromEntries(SECTIONS.map((k) => [k, clip(v[k], 2000)])) as Record<(typeof SECTIONS)[number], string>;
      }
      if (!content["en"]) return { ok: false, error: "The draft came back incomplete. Try again." };
      return { ok: true, content };
    } catch (e) {
      console.error("draftNotice failed", e instanceof GatewayError ? `${e.code} ${e.message}` : e);
      if (e instanceof GatewayError && e.httpStatus === 402) return { ok: false, error: "AI credits have run out for this workspace." };
      if (e instanceof GatewayError && e.httpStatus === 429) return { ok: false, error: "Too many drafts right now. Try again in a minute." };
      return { ok: false, error: "Couldn't draft the notice right now. Try again." };
    }
  });
