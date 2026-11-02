import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Vendors";

export const Route = createFileRoute("/app/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors · Sahmati" },
      { name: "description", content: "Vendors in your school's Sahmati console." },
      { property: "og:title", content: "Vendors · Sahmati" },
      { property: "og:description", content: "Vendors in your school's Sahmati console." },
    ],
  }),
  component: Page,
});
