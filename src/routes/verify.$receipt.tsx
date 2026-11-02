import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Verify";

export const Route = createFileRoute("/verify/$receipt")({
  head: () => ({
    meta: [
      { title: "Consent receipt · Sahmati" },
      { name: "description", content: "Verification of a Sahmati consent receipt." },
      { property: "og:title", content: "Consent receipt · Sahmati" },
      { property: "og:description", content: "Verification of a Sahmati consent receipt." },
    ],
  }),
  component: Page,
});
