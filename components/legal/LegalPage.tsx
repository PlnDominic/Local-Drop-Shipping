import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone } from 'lucide-react';
import { SITE } from '../../lib/site';

const LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/shipping', label: 'Shipping Policy' },
  { href: '/returns', label: 'Returns & Refunds' },
];

export const LegalSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-9">
    <h2 className="text-[19px] font-black text-[#151515]">{title}</h2>
    <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-[#444] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#f04438] [&_a]:font-semibold hover:[&_a]:underline">
      {children}
    </div>
  </section>
);

/** Shared shell for the policy pages: brand header, readable column, policy links footer. */
export const LegalPage: React.FC<{ title: string; intro: string; children: React.ReactNode }> = ({
  title,
  intro,
  children,
}) => (
  <div className="min-h-screen bg-white font-sans text-[#151515]">
    <header className="bg-[#151515] text-white">
      <div className="max-w-[860px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="font-black text-[15px] sm:text-[17px] tracking-tight">
          Localdropshipping<span className="text-[#f04438]">gh</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>
    </header>

    <main className="max-w-[860px] mx-auto px-4 py-12">
      <p className="text-[11px] font-black uppercase tracking-widest text-[#f04438]">Legal</p>
      <h1 className="mt-2 text-[32px] sm:text-[40px] font-black leading-tight">{title}</h1>
      <p className="mt-2 text-[12px] text-[#999]">Last updated {SITE.policiesUpdated}</p>
      <p className="mt-5 text-[15px] leading-relaxed text-[#444]">{intro}</p>
      {children}

      <div className="mt-12 rounded border border-black/10 bg-[#fafafa] p-5 text-[13px] text-[#555]">
        <p className="font-black text-[#151515]">Questions about this policy?</p>
        <p className="mt-1">
          Call{' '}
          {SITE.phones.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && ' or '}
              <a href={`tel:${p.replace(/\s/g, '')}`} className="font-semibold text-[#151515] hover:text-[#f04438]">{p}</a>
            </React.Fragment>
          ))}
          {SITE.supportEmail && (
            <>
              , email <a href={`mailto:${SITE.supportEmail}`} className="font-semibold text-[#151515] hover:text-[#f04438]">{SITE.supportEmail}</a>
            </>
          )}
          , or open a ticket from your <Link href="/support" className="font-semibold text-[#f04438] hover:underline">support page</Link>.
        </p>
      </div>
    </main>

    <footer className="border-t border-black/10">
      <div className="max-w-[860px] mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#777]">
        <span>© {new Date().getFullYear()} {SITE.name}{SITE.legalName ? ` · ${SITE.legalName}` : ''} · {SITE.location}</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 font-semibold" aria-label="Policies">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[#f04438]">{l.label}</Link>
          ))}
        </nav>
        <span className="inline-flex items-center gap-1.5"><Phone size={12} /> {SITE.phones[0]}</span>
      </div>
    </footer>
  </div>
);
