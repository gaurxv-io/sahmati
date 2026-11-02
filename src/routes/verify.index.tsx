import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Verify";

export const Route = createFileRoute("/verify/")({
  head: () => ({
    meta: [
      { title: "Verify a consent receipt · Sahmati" },
      { name: "description", content: "Check a Sahmati consent receipt against the tamper-evident ledger." },
      { property: "og:title", content: "Verify a consent receipt · Sahmati" },
      { property: "og:description", content: "Check a Sahmati consent receipt against the tamper-evident ledger." },
    ],
  }),
  component: Page,
});
