import type { Metadata } from "next";
import { Suspense } from "react";
import "@haramain/ui/styles.css";
import { siteUrl } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Haramain Ride — Premium pilgrim ground transport",
    template: "%s · Haramain Ride",
  },
  description:
    "Pilot booking platform for private transfers across Jeddah, Makkah and Madinah. Not live licensed operations until compliance sign-off.",
  applicationName: "Haramain Ride",
  keywords: [
    "Haramain Ride",
    "Jeddah",
    "Makkah",
    "Madinah",
    "pilgrim transport",
    "airport transfer",
    "Saudi Arabia",
  ],
  authors: [{ name: "Haramain Ride" }],
  openGraph: {
    type: "website",
    siteName: "Haramain Ride",
    locale: "en_US",
    alternateLocale: ["ar_SA"],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Manrope:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>{children}</Suspense>
      </body>
    </html>
  );
}
