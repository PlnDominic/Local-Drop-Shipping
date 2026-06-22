'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalStore } from '../store/globalStore';
import type { LucideIcon } from 'lucide-react';
import {
  ShoppingBag,
  TrendingUp,
  Truck,
  ShieldAlert,
  Code,
  Bell,
  Wallet,
  Smartphone
} from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export const Navigation: React.FC = () => {
  const { cart, wallets, notifications, currentUserId } = useGlobalStore();
  const pathname = usePathname();

  const links: NavLink[] = [
    { href: '/',            label: 'Marketplace',        icon: ShoppingBag, desc: 'Browse & buy products via MoMo' },
    { href: '/dropshipper', label: 'Start Dropshipping',  icon: TrendingUp,  desc: 'Import products, set markups, earn commissions' },
    { href: '/supplier',    label: 'Supplier Portal',     icon: Truck,       desc: 'List wholesale items, fulfill orders' },
    { href: '/admin',       label: 'Admin Panel',         icon: ShieldAlert, desc: 'Verify suppliers, platform analytics' },
    { href: '/docs',        label: 'API Docs & ERD',      icon: Code,        desc: 'API docs, Database ERD, Architecture' },
  ];

  const getWalletDisplay = () => {
    if (!currentUserId) return null;
    const onWalletPage = pathname === '/dropshipper' || pathname === '/supplier' || pathname === '/admin';
    const balance = wallets[currentUserId]?.balance;
    if (!onWalletPage || balance === undefined) return null;
    return `GHS ${balance.toFixed(2)}`;
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const walletDisplay = getWalletDisplay();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-primary flex items-center justify-center text-accent font-black text-base shadow-md">
            LD
          </div>
          <div className="leading-none">
            <span className="font-extrabold text-lg text-primary tracking-tight">Local Drop Shipping</span>
            <span className="text-accent font-black text-lg"> GH</span>
          </div>
        </Link>

        {/* Nav tabs */}
        <nav className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {links.map((r) => {
            const Icon = r.icon;
            const isActive = pathname === r.href;
            return (
              <Link
                key={r.href}
                href={r.href}
                title={r.desc}
                className={`flex items-center gap-1.5 px-3 h-16 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-gray hover:text-neutral-dark hover:border-gray-300'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-primary' : 'text-gray-400'} />
                <span>{r.label}</span>
                {r.href === '/' && cartCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 ml-0.5">
                    {cartCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {walletDisplay && (
            <div className="hidden sm:flex items-center gap-1.5 bg-primary-light text-primary font-bold px-3 py-1.5 border border-primary/10 text-sm">
              <Wallet size={14} />
              <span>{walletDisplay}</span>
            </div>
          )}
          <Link
            href="/simulator"
            title="Mobile app simulator"
            className="p-2 text-neutral-gray hover:text-neutral-dark hover:bg-gray-100 transition-colors"
          >
            <Smartphone size={20} />
          </Link>
          <div className="relative">
            <button className="p-2 text-neutral-gray hover:text-neutral-dark hover:bg-gray-100 transition-colors">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
              )}
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
