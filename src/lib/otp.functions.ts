import { createServerFn } from "@tanstack/react-start";

/** SMS providers. Add another by implementing this shape and listing it in PROVIDERS. */
type SmsProvider = { name: string; configured: () => boolean; send: (mobile91: string, code: string) => Promise<void> };

const PROVIDERS: SmsProvider[] = [
  {
    name: "msg91",
    configured: () => !!process.env["MSG91_AUTH_KEY"] && !!process.env["MSG91_TEMPLATE_ID"],
    send: async (mobile91, code) => {
      const url = new URL("https://control.msg91.com/api/v5/otp");
      url.searchParams.set("template_id", process.env["MSG91_TEMPLATE_ID"]!);
      url.searchParams.set("mobile", mobile91);
      url.searchParams.set("otp", code);
      const res = await fetch(url, { method: "POST", headers: { authkey: process.env["MSG91_AUTH_KEY"]!, "content-type": "application/json" }, body: "{}" });
      const body = await res.text();
      // Never log the code; the response body from MSG91 does not contain it.
      if (!res.ok || /"type"\s*:\s*"error"/.test(body)) throw new Error(`MSG91 failed [${res.status}]: ${body.slice(0, 200)}`);
    },
  },
];

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type SendCodeResult = { ok: true; code?: string } | { ok: false; error: "invalid" | "rate" | "sms" };

/** Public: the parent's private link (student id) is the key. Codes are stored only as a hash. */
export const sendParentCode = createServerFn({ method: "POST" })
  .inputValidator((d: { sid: string }) => {
    if (typeof d?.sid !== "string" || !/^[a-z0-9]{2,40}$/i.test(d.sid)) throw new Error("Invalid link");
    return { sid: d.sid };
  })
  .handler(async ({ data }): Promise<SendCodeResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1000000;
    const code = String(n).padStart(6, "0");
    const ttl = Number(process.env["OTP_TTL_SECONDS"] ?? 600) || 600;
    const { data: r, error } = await supabaseAdmin.rpc("otp_issue", { _sid: data.sid, _hash: await sha256(`${data.sid}:${code}`), _ttl_seconds: ttl });
    if (error) { console.error("otp_issue failed", error.message); throw new Error("Could not create a code"); }
    const res = r as { ok: boolean; error?: "invalid" | "rate"; demo?: boolean; phone?: string };
    if (!res.ok) return { ok: false, error: res.error ?? "invalid" };
    const provider = PROVIDERS.find((p) => p.configured());
    if (res.demo || !provider) return { ok: true, code };
    try {
      await provider.send(`91${res.phone}`, code);
    } catch (e) {
      console.error(`SMS via ${provider.name} failed`, e instanceof Error ? e.message : e);
      return { ok: false, error: "sms" };
    }
    return { ok: true };
  });
