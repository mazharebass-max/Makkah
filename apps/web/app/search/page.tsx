import type { Metadata } from "next";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";
import SearchClient from "./SearchClient";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "search", locale, pathname: "/search" });
}

export default function SearchPage() {
  return <SearchClient />;
}
