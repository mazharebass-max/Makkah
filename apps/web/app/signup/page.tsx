import { redirect } from "next/navigation";

/** Old /signup URLs land on the unified auth page. */
export default function SignupRedirect({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const lang = searchParams?.lang === "ar" ? "ar" : "en";
  redirect(`/login?lang=${lang}&mode=signup`);
}
