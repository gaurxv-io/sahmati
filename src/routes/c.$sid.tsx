import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Parent";

export const Route = createFileRoute("/c/$sid")({
  head: () => ({
    meta: [
      { title: "Give consent · Sahmati" },
      { name: "description", content: "Review and give consent for your child's data under India's DPDP Act." },
      { property: "og:title", content: "Give consent · Sahmati" },
      { property: "og:description", content: "Review and give consent for your child's data under India's DPDP Act." },
    ],
  }),
  component: Page,
});
