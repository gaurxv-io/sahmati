import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/PublicSchool";

export const Route = createFileRoute("/s/$slug")({
  head: () => ({
    meta: [
      { title: "DPDP Ready status · Sahmati" },
      { name: "description", content: "How this school protects children's data under India's DPDP Act." },
      { property: "og:title", content: "DPDP Ready status · Sahmati" },
      { property: "og:description", content: "How this school protects children's data under India's DPDP Act." },
    ],
  }),
  component: Page,
});
