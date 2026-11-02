import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Team";

export const Route = createFileRoute("/app/team")({
  head: () => ({
    meta: [
      { title: "Team · Sahmati" },
      { name: "description", content: "Staff roles and access for your school." },
      { property: "og:title", content: "Team · Sahmati" },
      { property: "og:description", content: "Staff roles and access for your school." },
    ],
  }),
  component: Page,
});
