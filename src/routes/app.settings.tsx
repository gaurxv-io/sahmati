import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Settings";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Sahmati" },
      { name: "description", content: "Settings in your school's Sahmati console." },
      { property: "og:title", content: "Settings · Sahmati" },
      { property: "og:description", content: "Settings in your school's Sahmati console." },
    ],
  }),
  component: Page,
});
