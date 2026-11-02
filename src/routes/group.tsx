import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Group";

export const Route = createFileRoute("/group")({
  head: () => ({
    meta: [
      { title: "Group view · Sahmati" },
      { name: "description", content: "Every school in your group: consent, requests, breaches and readiness side by side." },
      { property: "og:title", content: "Group view · Sahmati" },
      { property: "og:description", content: "Every school in your group: consent, requests, breaches and readiness side by side." },
    ],
  }),
  component: Page,
});
