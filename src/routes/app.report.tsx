import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Report";

export const Route = createFileRoute("/app/report")({
  head: () => ({
    meta: [
      { title: "Report · Sahmati" },
      { name: "description", content: "Report in your school's Sahmati console." },
      { property: "og:title", content: "Report · Sahmati" },
      { property: "og:description", content: "Report in your school's Sahmati console." },
    ],
  }),
  component: Page,
});
