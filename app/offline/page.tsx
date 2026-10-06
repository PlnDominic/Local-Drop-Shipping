import type { Metadata } from 'next';

export const metadata: Metadata = { title: "You're offline", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#151515] text-2xl font-black text-white">L</div>
        <h1 className="text-[22px] font-black text-[#151515]">You&apos;re offline</h1>
        <p className="mt-2 text-[14px] text-[#555]">
          We can&apos;t reach the internet right now. Check your data or Wi-Fi, then try again.
        </p>
        <a href="/marketplace" className="mt-5 inline-block rounded bg-[#f04438] px-6 py-2.5 text-[13px] font-black text-white">Try again</a>
      </div>
    </main>
  );
}
