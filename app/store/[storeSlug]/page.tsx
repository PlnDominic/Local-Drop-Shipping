import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DropshipperStorefront } from '../../../views/DropshipperStorefront';
import { getStoreMeta } from '../../../lib/server/catalog';
import { absoluteUrl, jsonLdString, truncate } from '../../../lib/seo';
import { SITE } from '../../../lib/site';

export const revalidate = 300;

type Params = { params: Promise<{ storeSlug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStoreMeta(storeSlug);
  if (store === null) return { title: 'Store not found', robots: { index: false, follow: false } };

  const name = store?.name || storeSlug;
  const description = truncate(
    store?.description || `Shop ${name} on ${SITE.name}. Local products delivered across Ghana with GhanaPost GPS addresses.`,
    158,
  );
  const url = absoluteUrl(`/store/${storeSlug}`);
  const image = store?.logoUrl && /^https:\/\//i.test(store.logoUrl) ? store.logoUrl : undefined;

  return {
    title: `${name} | ${SITE.name}`,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: name, description, url, siteName: SITE.name, images: image ? [{ url: image, alt: name }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: name, description, images: image ? [image] : undefined },
  };
}

export default async function StorePage({ params }: Params) {
  const { storeSlug } = await params;
  if (!storeSlug) notFound();

  const store = await getStoreMeta(storeSlug);
  // null means the database answered and there is no such store; undefined means we couldn't check.
  if (store === null) notFound();

  const jsonLd = store
    ? {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: store.name,
        url: absoluteUrl(`/store/${store.slug}`),
        description: store.description || undefined,
        image: store.logoUrl || undefined,
        areaServed: { '@type': 'Country', name: 'Ghana' },
        parentOrganization: { '@type': 'Organization', name: SITE.name, url: SITE.url },
      }
    : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />}
      <DropshipperStorefront storeSlug={storeSlug} />
    </>
  );
}
