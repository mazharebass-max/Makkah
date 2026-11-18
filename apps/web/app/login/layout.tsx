import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Haramain Ride",
  description: "Sign in or create a Haramain Ride pilot account and verify email via sandbox OTP.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
