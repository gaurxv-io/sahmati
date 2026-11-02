import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Pack";

export const Route = createFileRoute("/app/students_/$sid/pack")({
  head: () => ({
    meta: [
      { title: "Data pack · Sahmati" },
      { name: "description", content: "A student's data pack, ready to print or share with the parent." },
      { property: "og:title", content: "Data pack · Sahmati" },
      { property: "og:description", content: "A student's data pack, ready to print or share with the parent." },
    ],
  }),
  component: Page,
});
