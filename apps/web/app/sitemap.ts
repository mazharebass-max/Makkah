import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "../lib/seo";

const publicPaths = [
  "/",
  "/search",
  "/contact",
  "/how-it-works",
  "/fleet",
  "/routes",
  "/routes/JED-MAKKAH",
  "/routes/MAKKAH-MADINAH",
  "/routes/MED-MADINAH",
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

  const priorityFor = (path: (typeof publicPaths)[number]) => {
    if (path === "/") return 1;
    if (path.startsWith("/routes/")) return 0.85;
    if (path === "/routes" || path === "/fleet" || path === "/contact" || path === "/about") return 0.8;
    if (path === "/how-it-works" || path === "/faq" || path === "/search") return 0.75;
    return 0.55;
  };

  for (const path of publicPaths) {
    for (const locale of ["en", "ar"] as const) {
      entries.push({
        url: absoluteUrl(path, locale),
        lastModified,
        changeFrequency: path === "/" || path.startsWith("/routes") ? "weekly" : "monthly",
        priority: priorityFor(path),
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
      changeFrequency: path === "/" || path.startsWith("/routes") ? "weekly" : "monthly",
      priority: path === "/" ? 0.9 : path.startsWith("/routes/") ? 0.75 : 0.6,
    });
  }

  return entries;
}
