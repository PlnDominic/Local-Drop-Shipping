import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '../../components/legal/LegalPage';
import { POLICY, SITE } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service - Local Drop Shipping GH',
  description: 'The rules for buying, selling and supplying on Local Drop Shipping GH.',
  alternates: { canonical: `${SITE.url}/terms` },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms apply when you use ${SITE.name} (the "Platform") as a customer, dropshipper or supplier. By creating an account, joining the waitlist or placing an order you agree to them. If you do not agree, please do not use the Platform.`}
    >
      <LegalSection title="1. What the Platform is">
        <p>
          {SITE.name} connects three groups of people: <strong>customers</strong> who buy products,
          <strong> dropshippers</strong> who run online stores and set their own selling prices, and
          <strong> suppliers</strong> who stock and deliver the products. We provide the technology, order handling,
          wallets and support. In most cases the sale is between the customer and the dropshipper&apos;s store, and
          the supplier prepares and sends the goods.
        </p>
        {SITE.legalName && <p>The Platform is operated by {SITE.legalName}.</p>}
      </LegalSection>

      <LegalSection title="2. Your account">
        <ul>
          <li>You must be at least 18 years old, or have a parent or guardian&apos;s permission.</li>
          <li>Give accurate information and keep it up to date, including your phone number and delivery details.</li>
          <li>Keep your password safe. You are responsible for activity on your account. Tell us at once if you suspect someone else is using it.</li>
          <li>You may not pretend to be someone else, create accounts to abuse offers, or change your own role or approval status other than through the screens we provide.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Orders, prices and fees">
        <ul>
          <li>Prices are in Ghana cedis (GHS). Dropshippers set their own selling prices; suppliers set the wholesale cost.</li>
          <li>At checkout you see the item prices, a <strong>service fee</strong> and a <strong>delivery fee</strong> before you confirm. The delivery fee depends on your region and city and is charged once per store order.</li>
          <li>An order is accepted once it appears in your account with an order number. A store or supplier may cancel an order that cannot be fulfilled, for example when stock has run out, and you will be told why.</li>
          <li>Listings, photos and descriptions come from suppliers and stores. We work to keep them accurate but cannot promise there are no mistakes.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Delivery, cancellations and refunds">
        <p>
          Delivery is covered by our <Link href="/shipping">Shipping Policy</Link>. Cancellations, returns and refunds are
          covered by our <Link href="/returns">Returns &amp; Refunds Policy</Link>. In short: you can cancel for free until
          an order is shipped, and you can ask for a return or refund within {POLICY.returnWindowDays} days of delivery if
          an item is wrong, damaged or not as described.
        </p>
      </LegalSection>

      <LegalSection title="5. Dropshippers: commissions and wallet">
        <ul>
          <li>Your commission on an order is the selling price minus the supplier&apos;s wholesale cost, for the items in that order.</li>
          <li>Your commission is worked out from the supplier&apos;s cost at the time the customer ordered, so a later price change does not affect orders already placed.</li>
          <li>Commission is credited to your wallet when an order is marked as shipped. If that order is later cancelled or refunded, the commission is taken back from your wallet. If you have already withdrawn it, your balance can go below zero and you cannot withdraw until it is cleared by future earnings.</li>
          <li>When you request a withdrawal, the amount is set aside from your wallet straight away. We review each request and then send it to the mobile money account you provide. You can cancel a request until it has been reviewed. If we decline a request or the transfer fails, the amount goes back to your wallet. Minimum and maximum amounts and any payout fee are shown before you confirm. You are responsible for entering the correct number and account name.</li>
          <li>Do not sell below the supplier&apos;s cost, publish false claims about products, or place orders on your own store to collect commission.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Suppliers: approval, verification and payouts">
        <ul>
          <li>Suppliers must be approved by us before their products can be sold. We may also ask for identity and business documents (such as a Ghana Card and business registration) before awarding a <strong>Verified</strong> badge. We may refuse or withdraw approval or the badge at our discretion, for example for false documents or repeated complaints.</li>
          <li>You must stock what you list, pack orders promptly, mark them shipped only when they are actually dispatched, and describe products honestly.</li>
          <li>Your payout for an order is based on your cost at the time the customer ordered. It is credited to your wallet when the order is marked shipped and is taken back if the order is cancelled or refunded. You withdraw it to mobile money on the same terms as dropshippers (section 5).</li>
          <li>Counterfeit, stolen, unsafe or illegal goods are strictly prohibited, as are goods whose sale is restricted in Ghana without the required permits.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Support and disputes">
        <p>
          If something goes wrong, open a ticket from your <Link href="/support">support page</Link>. Customers, the
          store and the supplier involved in an order can all take part in the ticket, and our team can step in. We will
          try to resolve disputes fairly based on the order records, messages and any photos provided. Our decision on
          wallet adjustments between users of the Platform is final for the purposes of the Platform, but does not
          limit any rights you have under the law.
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <ul>
          <li>No fraud, harassment, spam, or attempts to access other people&apos;s accounts or data.</li>
          <li>No automated scraping, probing or overloading of the Platform.</li>
          <li>No uploading of content you do not have the right to use.</li>
        </ul>
        <p>We may suspend or close accounts that break these terms, and may withhold wallet balances that are connected to fraud or are subject to a dispute until it is resolved.</p>
      </LegalSection>

      <LegalSection title="9. Our responsibility">
        <p>
          We take reasonable care to run the Platform, but it is provided &quot;as is&quot; and may sometimes be
          unavailable. Products are supplied by independent suppliers; subject to the law, we are not responsible for
          their quality beyond the refund and support processes described here. Nothing in these terms removes or limits
          any right or liability that cannot lawfully be excluded, including your rights as a consumer in Ghana.
        </p>
      </LegalSection>

      <LegalSection title="10. Privacy">
        <p>How we collect and use personal data is explained in our <Link href="/privacy">Privacy Policy</Link>.</p>
      </LegalSection>

      <LegalSection title="11. Changes and governing law">
        <p>
          We may update these terms as the Platform grows. The latest version is always on this page and the date at the
          top shows when it last changed; for significant changes we will notify account holders. Continued use after a
          change means you accept it. These terms are governed by the laws of the Republic of Ghana.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
