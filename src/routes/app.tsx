import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Layout";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "School console · Sahmati" },
      { name: "description", content: "Your school's DPDP compliance console." },
      { property: "og:title", content: "School console · Sahmati" },
      { property: "og:description", content: "Your school's DPDP compliance console." },
    ],
  }),
  component: Page,
});
