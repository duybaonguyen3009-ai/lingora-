import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://lingona.app", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://lingona.app/login", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://lingona.app/register", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://lingona.app/leaderboard", lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: "https://lingona.app/privacy", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: "https://lingona.app/data-deletion", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
