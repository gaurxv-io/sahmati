import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Breach";

export const Route = createFileRoute("/app/breach")({
  head: () => ({
    meta: [
      { title: "Data breach response · Sahmati" },
      { name: "description", content: "72-hour data breach response in your school's Sahmati console." },
      { property: "og:title", content: "Data breach response · Sahmati" },
      { property: "og:description", content: "72-hour data breach response in your school's Sahmati console." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { new?: number | undefined } => ({ new: s["new"] != null && s["new"] !== "" ? 1 : undefined }),
  component: Page,
});
