import { notFound } from 'next/navigation';
import { DropshipperStorefront } from '../../../views/DropshipperStorefront';

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  return {
    title: `${storeSlug} | Local Drop Shipping GH`,
    description: `Shop from ${storeSlug}'s custom storefront. Local dropshipping with MTN MoMo payment and GhanaPost GPS delivery.`,
  };
}

export default async function StorePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  if (!storeSlug) {
    notFound();
  }

  return <DropshipperStorefront storeSlug={storeSlug} />;
}
