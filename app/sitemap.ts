import type { MetadataRoute } from 'next';
import { SITE } from '../lib/site';
import { getSitemapEntries } from '../lib/server/catalog';

// Rebuilt hourly so new products and stores are discovered without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();
  const { products, stores } = await getSitemapEntries();

  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/dropshipper`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    ...stores.map((s) => ({ url: `${base}${s.path}`, lastModified: new Date(s.lastModified), changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}${p.path}`, lastModified: new Date(p.lastModified), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...['terms', 'privacy', 'shipping', 'returns'].map((page) => ({
      url: `${base}/${page}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];
}
