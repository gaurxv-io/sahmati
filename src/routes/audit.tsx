import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Audit";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Free DPDP self-audit for schools · Sahmati" },
      { name: "description", content: "Answer 12 questions in 5 minutes and get your school's DPDP readiness score and gap report." },
      { property: "og:title", content: "Free DPDP self-audit for schools · Sahmati" },
      { property: "og:description", content: "Answer 12 questions in 5 minutes and get your school's DPDP readiness score and gap report." },
    ],
  }),
  component: Page,
});
