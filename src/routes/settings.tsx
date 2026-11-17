import { createFileRoute } from "@tanstack/react-router";
import { AccountProfileSettings } from "@/components/AccountProfileSettings";
export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Account settings — STAR GOATS FARM" },
    { name: "description", content: "Manage your personal contact details, login ID and password securely." },
    { property: "og:title", content: "Account settings — STAR GOATS FARM" },
    { property: "og:description", content: "Your private account and sign-in settings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <div className="space-y-6"><h1 className="text-2xl font-semibold">Settings</h1><AccountProfileSettings /></div>,
});