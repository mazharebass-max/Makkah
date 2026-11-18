import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "My trips",
  description: "Authenticated trip history — not indexed.",
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
