import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '../../components/legal/LegalPage';
import { SITE } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Shipping Policy - Local Drop Shipping GH',
  description: 'Where we deliver, delivery fees, timing and what to do if something goes wrong.',
  alternates: { canonical: `${SITE.url}/shipping` },
};

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      title="Shipping Policy"
      intro="We deliver across Ghana. This page explains how delivery fees and times work and what we need from you to get your order to the right place."
    >
      <LegalSection title="1. Where we deliver">
        <p>We deliver to all 16 regions of Ghana. Delivery fees and times differ by region and, for some cities, by city.</p>
      </LegalSection>

      <LegalSection title="2. Delivery fees">
        <ul>
          <li>Choose your region and city at checkout and we show the exact delivery fee and the estimated delivery time <strong>before</strong> you place the order.</li>
          <li>The fee is charged <strong>once per store order</strong>. If your cart has items from more than one store, it is split into one order per store, and each order has its own delivery fee. Checkout shows the total.</li>
          <li>The fee you see at checkout is the fee you pay. It is not changed after the order is placed.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How long it takes">
        <ul>
          <li>The estimate at checkout is in <strong>business days</strong> and starts when the supplier ships your order, after they have prepared it.</li>
          <li>Estimates are not guarantees. Public holidays, weather, road conditions and supplier stock can cause delays.</li>
          <li>Follow your order&apos;s status (pending, confirmed, processing, shipped, delivered) on your <Link href="/orders">My Orders</Link> page.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Your delivery details">
        <ul>
          <li>You need a valid <strong>GhanaPost GPS digital address</strong> (for example GA-184-9022). Checkout checks the format, but we cannot check that the address is the one you mean, so please double-check it.</li>
          <li>Give a phone number that is switched on and answered. Riders call before delivery.</li>
          <li>Use the delivery note for landmarks or gate instructions.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. When your parcel arrives">
        <ul>
          <li>Check the parcel before you accept it where you can, and take photos if anything looks damaged.</li>
          <li>If nobody is reachable at the address after repeated attempts, the order may be returned to the supplier. We will contact you to rearrange; extra delivery charges may apply for redelivery.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Something wrong with delivery?">
        <ul>
          <li>Marked shipped but not arrived? Ask for a refund from <Link href="/orders">My Orders</Link> using &quot;Not received&quot;.</li>
          <li>Damaged, wrong or missing items: see our <Link href="/returns">Returns &amp; Refunds Policy</Link>.</li>
          <li>Anything else: open a ticket from your <Link href="/support">support page</Link>.</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
