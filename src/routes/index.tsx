import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sahmati · DPDP compliance for Indian schools" },
      { name: "description", content: "DPDP compliance for Indian schools: parent consent on WhatsApp, tamper-evident records, reports and the DPDP Ready School badge." },
      { property: "og:title", content: "Sahmati · DPDP compliance for Indian schools" },
      { property: "og:description", content: "DPDP compliance for Indian schools: parent consent on WhatsApp, tamper-evident records, reports and the DPDP Ready School badge." },
    ],
  }),
  component: Page,
});
