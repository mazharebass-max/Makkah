import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Checkout",
  description: "Sandbox checkout flow — not indexed.",
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
