import React from 'react';
import { useGlobalStore } from '../store/globalStore';
import type { UserRole } from '../store/globalStore';
import type { LucideIcon } from 'lucide-react';
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Truck, 
  ShieldAlert, 
  Code, 
  Smartphone, 
  Monitor, 
  Bell, 
  Wallet
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeRole, setActiveRole, mobilePreview, setMobilePreview, cart, wallets, notifications } = useGlobalStore();

  const roles: { role: UserRole; label: string; icon: LucideIcon; color: string; desc: string }[] = [
    { 
      role: 'customer', 
      label: 'Customer Marketplace', 
      icon: ShoppingBag, 
      color: 'bg-blue-500', 
      desc: 'Browse, buy products via MoMo' 
    },
    { 
      role: 'dropshipper', 
      label: 'Dropshipper SaaS', 
      icon: TrendingUp, 
      color: 'bg-emerald-500', 
      desc: 'Import products, set markups, earn commissions' 
    },
    { 
      role: 'supplier', 
      label: 'Supplier Portal', 
      icon: Truck, 
      color: 'bg-purple-500', 
      desc: 'List wholesale items, fulfill shipments' 
    },
    { 
      role: 'admin', 
      label: 'Admin Control', 
      icon: ShieldAlert, 
      color: 'bg-red-500', 
      desc: 'Verify suppliers, platform analytics' 
    },
    { 
      role: 'developer', 
      label: 'System Docs & ERD', 
      icon: Code, 
      color: 'bg-gray-700', 
      desc: 'API docs, Database ERD, Architecture' 
    }
  ];

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'customer': return 'AMA (Customer)';
      case 'dropshipper': return 'KOFI (Dropshipper)';
      case 'supplier': return 'KANTANKA (Supplier)';
      case 'admin': return 'YAW (Platform Admin)';
      case 'developer': return 'System Architect';
    }
  };

  const getWalletDisplay = () => {
    if (activeRole === 'dropshipper') {
      return `GHS ${wallets['u-dropshipper-1']?.balance.toFixed(2)}`;
    }
    if (activeRole === 'supplier') {
      return `GHS ${wallets['u-supplier-1']?.balance.toFixed(2)}`;
    }
    if (activeRole === 'admin') {
      return `GHS ${wallets['u-admin-1']?.balance.toFixed(2)}`;
    }
    return null;
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      {/* Simulation Banner */}
      <div className="bg-neutral-dark text-white text-xs px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="bg-accent text-neutral-dark font-extrabold px-1.5 py-0.5 text-[10px] tracking-wider animate-pulse-border">
            SIMULATOR MODE
          </span>
          <span className="text-gray-300 font-medium">
            Click roles below to test the cross-platform dropshipping loops in real time.
          </span>
        </div>
        
        {/* Device Mode Selector */}
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-800 p-0.5 border border-gray-700">
            <button 
              onClick={() => setMobilePreview(false)}
              className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${!mobilePreview ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              title="Desktop Web Layout"
            >
              <Monitor size={12} />
              <span>Desktop</span>
            </button>
            <button 
              onClick={() => setMobilePreview(true)}
              className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${mobilePreview ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              title="Mobile App Viewport"
            >
              <Smartphone size={12} />
              <span>Mobile App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Selector Tabs */}
      <div className="bg-gray-50 border-b border-gray-200 overflow-x-auto scrollbar-none py-1">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = activeRole === r.role;
            return (
              <button
                key={r.role}
                onClick={() => setActiveRole(r.role)}
                className={`flex items-center gap-2 px-3 py-2 transition-all text-xs font-semibold whitespace-nowrap ${
                  isActive 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-neutral-gray hover:bg-gray-100 hover:text-neutral-dark'
                }`}
                title={r.desc}
              >
                <Icon size={14} className={isActive ? 'text-accent' : 'text-gray-400'} />
                <span>{r.label}</span>
                {r.role === 'customer' && cartCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 animate-bounce">
                    {cartCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Branding Header */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center text-accent font-black text-lg shadow-md">
            LD
          </div>
          <div>
            <span className="font-extrabold text-lg text-primary tracking-tight">LocalDropshipping</span>
            <span className="text-accent font-bold text-lg">.gh</span>
            <span className="hidden sm:inline text-xs text-neutral-gray ml-2 px-2 py-0.5 bg-gray-100 border border-gray-200">
              Ghana Hub
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="hidden md:flex items-center gap-1 text-gray-500">
            <Users size={16} />
            <span>Active Session:</span>
            <span className="text-neutral-dark font-bold bg-neutral-light px-2 py-0.5 border border-gray-200">
              {getRoleLabel(activeRole)}
            </span>
          </div>

          {getWalletDisplay() && (
            <div className="flex items-center gap-1.5 bg-primary-light text-primary font-bold px-3 py-1.5 border border-primary/10">
              <Wallet size={15} />
              <span>{getWalletDisplay()}</span>
            </div>
          )}

          <div className="relative">
            <button className="p-2 hover:bg-gray-100 text-neutral-gray hover:text-neutral-dark transition-colors relative">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
