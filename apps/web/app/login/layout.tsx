import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Sign in",
  description: "Customer sign-in for Haramain Ride — not indexed.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
