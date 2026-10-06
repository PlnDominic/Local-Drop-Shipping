import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '../../components/legal/LegalPage';
import { POLICY, SITE } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Returns & Refunds - Local Drop Shipping GH',
  description: 'How to cancel an order, return an item and get a refund.',
  alternates: { canonical: `${SITE.url}/returns` },
};

export default function ReturnsPage() {
  const days = POLICY.returnWindowDays;
  return (
    <LegalPage
      title="Returns & Refunds"
      intro="If something is not right with your order, here is how to cancel it, send it back and get your money back."
    >
      <LegalSection title="1. Cancel before it ships">
        <p>
          You can cancel an order yourself, free of charge, while its status is <strong>pending</strong> or
          <strong> confirmed</strong>. Go to <Link href="/orders">My Orders</Link> and choose Cancel. Once a supplier has
          started processing or has shipped an order, it can no longer be cancelled directly. Open a support ticket and
          we will try to stop it, or you can request a return or refund after it arrives.
        </p>
      </LegalSection>

      <LegalSection title={`2. Returns within ${days} days of delivery`}>
        <p>You can ask for a return and refund within <strong>{days} days of delivery</strong> if the item:</p>
        <ul>
          <li>is not what you ordered (wrong item, size or colour);</li>
          <li>arrived damaged or does not work;</li>
          <li>is not as described in the listing; or</li>
          <li>is missing parts or quantities.</li>
        </ul>
        <p>
          Returns for a change of mind are not covered unless the store agrees. Please keep the item unused, in its
          original packaging, with all accessories. We cannot accept returns of perishable goods, food, items made to
          order, or opened personal care, hygiene and underwear items unless they are faulty.
        </p>
      </LegalSection>

      <LegalSection title="3. Not received">
        <p>
          If your order is marked shipped but has not arrived within the estimated delivery time, use &quot;Not
          received&quot; in <Link href="/orders">My Orders</Link>. We will check with the supplier and delivery partner.
        </p>
      </LegalSection>

      <LegalSection title="4. How to ask">
        <ul>
          <li>Open <Link href="/orders">My Orders</Link>, find the order and choose &quot;Request return / refund&quot;.</li>
          <li>Describe the problem clearly. Photos help; add them to a support ticket for the order if needed.</li>
          <li>Our team reviews the request, usually within 3 business days, and may contact you or the supplier. You will see the decision on the same page.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Refunds">
        <ul>
          <li>Approved refunds cover the item price and, where the problem was caused by the store or supplier, the delivery fee.</li>
          <li>Refunds are sent to the mobile money number or account you paid from, and we aim to send them within 7 business days of approval. The request page shows when your refund has been sent.</li>
          <li>When a refund is approved, the commission and supplier payout for that order are reversed, so the order is settled fairly for everyone.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. If you disagree with a decision">
        <p>Reply in a support ticket for the order and a different team member will take another look. See our <Link href="/terms">Terms of Service</Link> for how disputes are handled.</p>
      </LegalSection>
    </LegalPage>
  );
}
