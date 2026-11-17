import type { Metadata } from "next";
import { Suspense } from "react";
import "@haramain/ui/styles.css";

export const metadata: Metadata = {
  title: "Haramain Ride",
  description: "Premium pilgrim and tourism ground transport — Jeddah, Makkah, Madinah",
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
