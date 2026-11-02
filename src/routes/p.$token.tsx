import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/ParentPack";

export const Route = createFileRoute("/p/$token")({
  head: () => ({
    meta: [
      { title: "Your child's data pack · Sahmati" },
      { name: "description", content: "A private, read-only copy of the data your child's school holds." },
      { property: "og:title", content: "Your child's data pack · Sahmati" },
      { property: "og:description", content: "A private, read-only copy of the data your child's school holds." },
    ],
  }),
  component: Page,
});
