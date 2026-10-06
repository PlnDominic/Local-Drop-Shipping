import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '../../components/legal/LegalPage';
import { SITE } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy - Local Drop Shipping GH',
  description: 'What personal data Local Drop Shipping GH collects, why, and your rights under Ghana’s Data Protection Act.',
  alternates: { canonical: `${SITE.url}/privacy` },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`${SITE.name} respects your privacy. This policy explains what personal data we collect, why we collect it, who sees it and what rights you have under Ghana's Data Protection Act, 2012 (Act 843).`}
    >
      <LegalSection title="1. Who is responsible for your data">
        <p>
          {SITE.legalName || SITE.name} ({SITE.location}) decides how and why your personal data is used, which makes
          us the &quot;data controller&quot;.
          {SITE.dpcRegistration && <> We are registered with the Data Protection Commission under number {SITE.dpcRegistration}.</>}
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <ul>
          <li><strong>Waitlist:</strong> your email address, whether you are joining as a dropshipper or supplier, and optionally your name.</li>
          <li><strong>Account:</strong> your name, email, phone number and password (stored securely, never in readable form). If you sign in with Google, we receive your name, email and profile picture from Google.</li>
          <li><strong>Orders:</strong> the name, phone number, region, city, GhanaPost GPS address and delivery notes you give at checkout, plus what you ordered and the amounts paid.</li>
          <li><strong>Dropshippers and suppliers:</strong> store or business details, wallet transactions and the mobile money number you use for withdrawals.</li>
          <li><strong>Supplier verification:</strong> your Ghana Card number, photos of the card and any business registration documents you upload. These are stored privately and are only visible to you and our verification team.</li>
          <li><strong>Support:</strong> messages and attachments you send in support tickets.</li>
          <li><strong>Technical:</strong> basic logs such as IP address, browser type and the time of requests, used to keep the Platform secure and working.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Why we use it">
        <ul>
          <li>To create and secure your account and let you sign in.</li>
          <li>To process orders, arrange delivery, handle payments, commissions, payouts, cancellations and refunds.</li>
          <li>To verify suppliers and prevent fraud and abuse.</li>
          <li>To contact you about your orders, support tickets and, for waitlist members, your invitation to join at launch.</li>
          <li>To meet legal obligations and keep financial records.</li>
        </ul>
        <p>We do not sell your personal data and we do not use it for third-party advertising.</p>
      </LegalSection>

      <LegalSection title="4. Who we share it with">
        <ul>
          <li><strong>The store and supplier fulfilling your order</strong> see your name, phone number and delivery address so they can deliver. Suppliers only see the items of yours that they supply.</li>
          <li><strong>Delivery partners</strong> receive what they need to deliver your parcel.</li>
          <li><strong>Payment providers</strong> (for example mobile money operators and card processors) handle payments and payouts.</li>
          <li><strong>Service providers</strong> that run the Platform for us, such as our database, authentication and file storage provider (Supabase), our hosting provider (Vercel) and our email provider. They may process data on servers outside Ghana and are only allowed to use it to provide their service to us.</li>
          <li><strong>Authorities</strong> where the law requires it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How long we keep it">
        <p>
          We keep account and order records for as long as your account is active and afterwards for as long as needed
          to resolve disputes and meet tax and accounting requirements. Waitlist emails are kept until you are invited
          or ask us to remove you. Verification documents are kept while you remain a supplier and deleted when they are
          no longer needed. You can ask us to delete your data at any time (see section 7).
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          Passwords are hashed, access to personal data is limited by role (for example, only administrators can see the
          waitlist and verification documents), and connections to the Platform are encrypted. No system is perfectly
          secure, so please also use a strong, unique password.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>Under the Data Protection Act you can:</p>
        <ul>
          <li>ask what personal data we hold about you and get a copy;</li>
          <li>ask us to correct data that is wrong or out of date;</li>
          <li>ask us to delete data we no longer need or have no right to keep;</li>
          <li>object to or restrict particular uses of your data, including marketing messages.</li>
        </ul>
        <p>
          To use any of these rights, call us or open a ticket on our <Link href="/support">support page</Link>
          {SITE.supportEmail && <> or email {SITE.supportEmail}</>}. We may need to confirm who you are first. You also
          have the right to complain to the <strong>Data Protection Commission</strong> of Ghana.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies and similar storage">
        <p>
          We use only essential browser storage: to keep you signed in, remember your cart and remember that you have
          seen our notices. We do not use advertising or cross-site tracking cookies. If you sign in with Google, Google
          may set its own cookies on its own pages.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>The Platform is not meant for children under 18 and we do not knowingly collect their data. If you think a child has given us personal data, tell us and we will delete it.</p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>We will update this policy when our practices change. The date at the top shows the latest version.</p>
      </LegalSection>
    </LegalPage>
  );
}
