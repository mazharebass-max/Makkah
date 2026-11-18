import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "../lib/seo";

const publicPaths = [
  "/",
  "/search",
  "/contact",
  "/how-it-works",
  "/fleet",
  "/routes",
  "/about",
  "/faq",
  "/legal/terms",
  "/legal/privacy",
  "/legal/cancellation",
  "/providers/apply",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of publicPaths) {
    for (const locale of ["en", "ar"] as const) {
      entries.push({
        url: absoluteUrl(path, locale),
        lastModified,
        changeFrequency: path === "/" ? "weekly" : "monthly",
        priority: path === "/" ? 1 : 0.7,
        alternates: {
          languages: {
            en: absoluteUrl(path, "en"),
            ar: absoluteUrl(path, "ar"),
          },
        },
      });
    }
  }

  // Also list locale-neutral path for crawlers that ignore query params
  for (const path of publicPaths) {
    entries.push({
      url: `${siteUrl()}${path === "/" ? "" : path}` || siteUrl(),
      lastModified,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 0.9 : 0.6,
    });
  }

  return entries;
}
