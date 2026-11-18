import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Booking confirmation",
  description: "Private booking confirmation — not indexed.",
};

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
