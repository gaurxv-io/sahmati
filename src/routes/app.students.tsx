import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Students";

export const Route = createFileRoute("/app/students")({
  head: () => ({
    meta: [
      { title: "Students · Sahmati" },
      { name: "description", content: "Students in your school's Sahmati console." },
      { property: "og:title", content: "Students · Sahmati" },
      { property: "og:description", content: "Students in your school's Sahmati console." },
    ],
  }),
  component: Page,
});
