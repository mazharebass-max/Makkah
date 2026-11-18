import type { Metadata } from "next";
import { buildPageMetadata, localeFromSearchParams } from "../../../lib/seo";
import ProviderApplyClient from "./ProviderApplyClient";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({
    key: "providerApply",
    locale,
    pathname: "/providers/apply",
  });
}

export default function ProviderApplyPage() {
  return <ProviderApplyClient />;
}
