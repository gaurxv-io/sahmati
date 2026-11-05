import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Students";

export const Route = createFileRoute("/app/students")({
  head: () => ({
    meta: [
      { title: "Students · Sahmati" },
      { name: "description", content: "Students in your school's Sahmati console." },
      { property: "og:title", content: "Students · Sahmati" },
      { property: "og:description", content: "Students in your school's Sahmati console." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { status?: string | undefined; remind?: string | undefined; import?: string | undefined; drive?: string | undefined; add?: string | undefined } => ({
    status: typeof s["status"] === "string" ? s["status"] : undefined,
    remind: s["remind"] != null ? String(s["remind"]) : undefined,
    import: s["import"] != null ? String(s["import"]) : undefined,
    drive: s["drive"] != null ? String(s["drive"]) : undefined,
    add: s["add"] != null ? String(s["add"]) : undefined,
  }),
  component: Page,
});
