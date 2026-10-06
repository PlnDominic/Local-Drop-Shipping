import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductPageData } from '../../../../lib/server/catalog';
import { absoluteUrl, breadcrumbJsonLd, isInStock, jsonLdString, productJsonLd, truncate } from '../../../../lib/seo';
import { SITE } from '../../../../lib/site';
import { ProductView } from '../../../../components/product/ProductView';

// Product pages are rebuilt at most every 5 minutes, so search engines get fast static HTML.
export const revalidate = 300;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const p = await getProductPageData(id).catch(() => null);
  if (!p) return { title: 'Product not found', robots: { index: false, follow: false } };

  const price = `GHS ${p.price.toFixed(2)}`;
  const title = `${p.name} | ${p.store.name || SITE.name}`;
  const description = truncate(
    `${price}. ${p.description || `Buy ${p.name} online in Ghana.`} Delivery across all 16 regions.`,
    158,
  );
  const url = absoluteUrl(`/product/${p.id}`);
  const image = p.images.find((u) => /^https:\/\//i.test(u));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: p.name,
      description,
      url,
      siteName: SITE.name,
      images: image ? [{ url: image, alt: p.name }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: p.name, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const data = await getProductPageData(id);
  if (!data) notFound();

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Marketplace', path: '/marketplace' },
    ...(data.category ? [{ name: data.category.name, path: `/marketplace?category=${data.category.slug}` }] : []),
    { name: data.name, path: `/product/${data.id}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd(data)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd(crumbs)) }} />
      <ProductView data={data} inStock={isInStock(data)} />
    </>
  );
}
