import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Overview";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Overview · Sahmati" },
      { name: "description", content: "Consent coverage and DPDP readiness for your school." },
      { property: "og:title", content: "Overview · Sahmati" },
      { property: "og:description", content: "Consent coverage and DPDP readiness for your school." },
    ],
  }),
  component: Page,
});
