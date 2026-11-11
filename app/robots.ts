import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.kavi.jeki.me").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/home", "/explore", "/posts/", "/profile/", "/llms.txt"],
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/settings",
          "/messages",
          "/notifications",
          "/bookmarks",
        ],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/llms.txt", "/home", "/explore", "/posts/"],
        disallow: ["/api/", "/admin/", "/auth/", "/settings", "/messages", "/notifications", "/bookmarks"],
      },
    ],
    host: baseUrl,
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
