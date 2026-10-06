import { SITE } from './site';
import type { ProductPageData } from './server/catalog';

export const truncate = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
};

export const absoluteUrl = (path: string): string => (path.startsWith('http') ? path : `${SITE.url}${path}`);

const money = (n: number) => n.toFixed(2);

/** Safe to embed in a <script type="application/ld+json"> tag even if user text contains "</script>". */
export const jsonLdString = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c');

export function isInStock(p: Pick<ProductPageData, 'variants' | 'stockQty'>): boolean {
  return p.variants.length > 0 ? p.variants.some((v) => v.stockQty > 0) : p.stockQty > 0;
}

/** schema.org Product with an Offer (or AggregateOffer when options have different prices). */
export function productJsonLd(p: ProductPageData) {
  const url = absoluteUrl(`/product/${p.id}`);
  const prices = p.variants.length ? p.variants.map((v) => p.price + v.priceAdjustment) : [p.price];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const availability = isInStock(p) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const seller = p.store.name ? { '@type': 'Organization', name: p.store.name, url: p.store.slug ? absoluteUrl(`/store/${p.store.slug}`) : undefined } : undefined;

  const offers =
    low === high
      ? { '@type': 'Offer', url, priceCurrency: 'GHS', price: money(low), availability, itemCondition: 'https://schema.org/NewCondition', seller }
      : { '@type': 'AggregateOffer', url, priceCurrency: 'GHS', lowPrice: money(low), highPrice: money(high), offerCount: prices.length, availability, seller };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: truncate(p.description || p.name, 500),
    image: p.images.length ? p.images : undefined,
    sku: p.sku || undefined,
    brand: p.supplier.name ? { '@type': 'Brand', name: p.supplier.name } : undefined,
    category: p.category?.name,
    url,
    offers,
    // Only emitted when real verified-buyer reviews exist (Google rejects made-up ratings).
    aggregateRating: p.rating.count > 0
      ? { '@type': 'AggregateRating', ratingValue: p.rating.average.toFixed(1), reviewCount: p.rating.count, bestRating: 5, worstRating: 1 }
      : undefined,
    review: p.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewerName },
      datePublished: r.createdAt.slice(0, 10),
      name: r.title || undefined,
      reviewBody: r.body || undefined,
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
