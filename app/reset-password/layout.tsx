import type { Metadata } from 'next';

// Account pages should never appear in search results. The reset token is in this page's URL,
// so never send it on as a Referer header to anything the page links or loads.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
