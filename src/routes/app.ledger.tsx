import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Ledger";

export const Route = createFileRoute("/app/ledger")({
  head: () => ({
    meta: [
      { title: "Ledger · Sahmati" },
      { name: "description", content: "Ledger in your school's Sahmati console." },
      { property: "og:title", content: "Ledger · Sahmati" },
      { property: "og:description", content: "Ledger in your school's Sahmati console." },
    ],
  }),
  component: Page,
});
