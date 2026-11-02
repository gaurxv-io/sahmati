import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Requests";

export const Route = createFileRoute("/app/requests")({
  head: () => ({
    meta: [
      { title: "Requests · Sahmati" },
      { name: "description", content: "Requests in your school's Sahmati console." },
      { property: "og:title", content: "Requests · Sahmati" },
      { property: "og:description", content: "Requests in your school's Sahmati console." },
    ],
  }),
  component: Page,
});
