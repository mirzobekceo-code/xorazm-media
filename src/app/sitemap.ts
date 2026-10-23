import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getDistricts, getProfessions } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [profs, dists, profiles] = await Promise.all([
    getProfessions(), getDistricts(),
    db.select({ slug: s.profiles.slug, updatedAt: s.profiles.updatedAt }).from(s.profiles).where(eq(s.profiles.status, "approved")),
  ]);
  const u = (p: string) => `${SITE.url}${p}`;
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/mutaxassislar"), changeFrequency: "daily", priority: 0.9 },
    ...profs.map((p) => ({ url: u(`/mutaxassislar/${p.slug}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...profs.flatMap((p) => dists.map((d) => ({ url: u(`/mutaxassislar/${p.slug}/${d.slug}`), changeFrequency: "weekly" as const, priority: 0.6 }))),
    ...profiles.map((p) => ({ url: u(`/m/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...["/savollar", "/reklama", "/shartlar", "/maxfiylik"].map((p) => ({ url: u(p), priority: 0.3 })),
  ];
}
