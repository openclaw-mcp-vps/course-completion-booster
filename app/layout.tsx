import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://coursecompletionbooster.com"),
  title: {
    default: "Course Completion Booster | Increase course completion rates with smart nudges",
    template: "%s | Course Completion Booster"
  },
  description:
    "Increase online course completion rates with behavior-based nudges, personalized reminders, and peer benchmark insights.",
  keywords: [
    "course completion",
    "online course retention",
    "student engagement analytics",
    "course creator SaaS",
    "edtech automation"
  ],
  openGraph: {
    title: "Course Completion Booster",
    description:
      "Track learning behavior and automatically send targeted nudges that keep students progressing.",
    type: "website",
    url: "https://coursecompletionbooster.com",
    siteName: "Course Completion Booster"
  },
  twitter: {
    card: "summary_large_image",
    title: "Course Completion Booster",
    description:
      "Turn stalled students into graduates with personalized, behavior-triggered nudges."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
