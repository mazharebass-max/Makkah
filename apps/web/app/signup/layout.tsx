import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — Haramain Ride",
  description: "Redirects to the unified account page for sign up and email verification.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
