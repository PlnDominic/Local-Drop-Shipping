'use client';

import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import type { UserRole } from '../store/globalStore';
import {
  ShoppingBag,
  TrendingUp,
  Truck,
  ShieldAlert,
  Code,
  Bell,
  Wallet,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

interface NavigationProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activePage, setActivePage }) => {
  const { activeRole, setActiveRole, cart, wallets, notifications } = useGlobalStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const getWalletBalance = () => {
    if (activeRole === 'dropshipper') return wallets['u-dropshipper-1']?.balance.toFixed(2);
    if (activeRole === 'supplier') return wallets['u-supplier-1']?.balance.toFixed(2);
    if (activeRole === 'admin') return wallets['u-admin-1']?.balance.toFixed(2);
    return null;
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'dropshipper', label: 'Start Dropshipping' },
    { id: 'supplier', label: 'Supplier Portal' },
  ];

  const portalLinks: { id: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'customer', label: 'Customer View', icon: ShoppingBag, desc: 'Browse & buy products' },
    { id: 'dropshipper', label: 'Dropshipper Dashboard', icon: TrendingUp, desc: 'Manage your store' },
    { id: 'supplier', label: 'Supplier Dashboard', icon: Truck, desc: 'List & fulfill orders' },
    { id: 'admin', label: 'Admin Panel', icon: ShieldAlert, desc: 'Platform analytics' },
    { id: 'developer', label: 'API Docs & ERD', icon: Code, desc: 'System architecture' },
  ];

  const handleNavClick = (id: string) => {
    setActivePage(id);
    setMobileMenuOpen(false);
    if (id === 'marketplace') setActiveRole('customer');
    if (id === 'dropshipper') setActiveRole('dropshipper');
    if (id === 'supplier') setActiveRole('supplier');
  };

  const handlePortalClick = (role: UserRole) => {
    setActiveRole(role);
    setActivePage(role === 'customer' ? 'marketplace' : role);
    setPortalDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const walletBalance = getWalletBalance();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 shrink-0"
        >
          <div className="w-9 h-9 bg-primary flex items-center justify-center text-accent font-black text-base shadow-md">
            LD
          </div>
          <div className="leading-none">
            <span className="font-extrabold text-lg text-primary tracking-tight">Local Drop Shipping</span>
            <span className="text-accent font-black text-lg"> GH</span>
          </div>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activePage === link.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-neutral-gray hover:text-neutral-dark'
              }`}
            >
              {link.label}
            </button>
          ))}

          {/* Portal dropdown */}
          <div className="relative">
            <button
              onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-semibold transition-colors ${
                ['admin', 'developer'].includes(activePage)
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-neutral-gray hover:text-neutral-dark'
              }`}
            >
              Portals <ChevronDown size={14} />
            </button>
            {portalDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 shadow-lg z-50">
                {portalLinks.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePortalClick(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Icon size={16} className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-neutral-dark">{p.label}</div>
                        <div className="text-xs text-neutral-gray">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          {walletBalance && (
            <div className="hidden sm:flex items-center gap-1.5 bg-primary-light text-primary font-bold px-3 py-1.5 border border-primary/10 text-sm">
              <Wallet size={14} />
              <span>GHS {walletBalance}</span>
            </div>
          )}

          <button
            onClick={() => handleNavClick('marketplace')}
            className="relative p-2 text-neutral-gray hover:text-neutral-dark transition-colors"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button className="p-2 text-neutral-gray hover:text-neutral-dark transition-colors">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 border-2 border-white"></span>
              )}
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-neutral-gray hover:text-neutral-dark transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded transition-colors ${
                activePage === link.id ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <p className="text-xs font-bold text-neutral-gray px-3 pb-1 uppercase tracking-wider">Portals</p>
            {portalLinks.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePortalClick(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <Icon size={15} className="text-primary shrink-0" />
                  <span className="text-sm font-semibold text-neutral-dark">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
