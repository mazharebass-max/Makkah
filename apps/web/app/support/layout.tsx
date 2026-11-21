import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Support",
  description: "Authenticated support inbox — not indexed.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
