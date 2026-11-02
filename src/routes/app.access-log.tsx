import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/AccessLog";

export const Route = createFileRoute("/app/access-log")({
  head: () => ({
    meta: [
      { title: "Access log · Sahmati" },
      { name: "description", content: "Who viewed, exported or changed student data." },
      { property: "og:title", content: "Access log · Sahmati" },
      { property: "og:description", content: "Who viewed, exported or changed student data." },
    ],
  }),
  component: Page,
});
