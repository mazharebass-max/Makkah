import type { Metadata } from "next";
import "@haramain/ui/styles.css";

export const metadata: Metadata = {
  title: "Haramain Admin",
  description: "Operations console — authenticated staff only",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Manrope:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: "#f3f1ec" }}>{children}</body>
    </html>
  );
}
