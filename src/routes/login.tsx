import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Sahmati" },
      { name: "description", content: "Sign in to your school's Sahmati console." },
      { property: "og:title", content: "Sign in · Sahmati" },
      { property: "og:description", content: "Sign in to your school's Sahmati console." },
    ],
  }),
  component: Page,
});
