import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — Haramain Ride",
  description: "Create a Haramain Ride pilot customer account and verify email via sandbox OTP.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
