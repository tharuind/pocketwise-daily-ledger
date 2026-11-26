import { createFileRoute } from "@tanstack/react-router";
import { MonefyApp } from "@/components/monefy/MonefyApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monefy Pro — Expense tracker" },
      { name: "description", content: "Track daily expenses and income across accounts with a simple pie chart view." },
      { property: "og:title", content: "Monefy Pro — Expense tracker" },
      { property: "og:description", content: "Track daily expenses and income across accounts with a simple pie chart view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MonefyApp,
});
