'use client';

import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { Marketplace } from '../views/Marketplace';
import { DropshipperDashboard } from '../views/DropshipperDashboard';
import { SupplierDashboard } from '../views/SupplierDashboard';
import { AdminDashboard } from '../views/AdminDashboard';
import { DiagramsAndDocs } from '../views/DiagramsAndDocs';
import { 
  Home as HomeIcon, 
  ShoppingBag, 
  LayoutDashboard, 
  BookOpen, 
  Wifi, 
  Battery 
} from 'lucide-react';

const AppShell: React.FC = () => {
  const { activeRole, mobilePreview } = useGlobalStore();

  // Mobile navigation selection inside the phone frame
  const [mobileTab, setMobileTab] = useState<'home' | 'shop' | 'dashboard' | 'docs'>('home');

  // Decide what to render based on the active role (Desktop mode)
  const renderDesktopContent = () => {
    switch (activeRole) {
      case 'customer':
        return <Marketplace />;
      case 'dropshipper':
        return <DropshipperDashboard />;
      case 'supplier':
        return <SupplierDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'developer':
        return <DiagramsAndDocs />;
      default:
        return <Marketplace />;
    }
  };

  // Decide what to render inside the Mobile Mockup Frame
  const renderMobileContent = () => {
    switch (mobileTab) {
      case 'home':
        return <Marketplace />;
      case 'shop':
        return <Marketplace />;
      case 'dashboard':
        // Display appropriate dashboard depending on active simulator role
        if (activeRole === 'supplier') {
          return <SupplierDashboard />;
        } else if (activeRole === 'admin') {
          return <AdminDashboard />;
        }
        // Default to dropshipper for dropshipper/customer
        return <DropshipperDashboard />;
      case 'docs':
        return <DiagramsAndDocs />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Simulator Device Wrapper */}
      {mobilePreview ? (
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-gray-900 dot-grid">
          {/* Phone Mockup Outer Frame */}
          <div className="relative mx-auto w-[375px] h-[812px] bg-[#111827] shadow-2xl border-[12px] border-gray-800 flex flex-col overflow-hidden ring-4 ring-gray-700/50">
            {/* Speaker & Sensor Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black z-50 flex items-center justify-center">
              {/* Camera dot */}
              <div className="w-2.5 h-2.5 bg-slate-900 border border-slate-800 ml-4"></div>
              {/* Speaker slit */}
              <div className="w-12 h-1 bg-slate-900 ml-3"></div>
            </div>

            {/* Mobile Status Bar */}
            <div className="h-11 bg-white text-neutral-dark px-6 flex justify-between items-end pb-1.5 text-[11px] font-bold z-40 select-none">
              <span>10:09</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-accent bg-accent-light px-1 py-0.2 font-black border border-accent/20">5G</span>
                <Wifi size={12} />
                <Battery size={14} className="fill-current" />
              </div>
            </div>

            {/* Scrollable Mobile screen viewports */}
            <div className="flex-1 overflow-y-auto bg-neutral-light scrollbar-none pb-16">
              {renderMobileContent()}
            </div>

            {/* Mobile Navigation bar */}
            <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 py-2.5 px-6 flex justify-between items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
              <button 
                onClick={() => setMobileTab('home')}
                className={`flex flex-col items-center gap-0.5 transition-colors ${mobileTab === 'home' ? 'text-primary font-bold' : 'text-gray-400'}`}
              >
                <HomeIcon size={18} />
                <span className="text-[9px]">Home</span>
              </button>

              <button 
                onClick={() => setMobileTab('shop')}
                className={`flex flex-col items-center gap-0.5 transition-colors ${mobileTab === 'shop' ? 'text-primary font-bold' : 'text-gray-400'}`}
              >
                <ShoppingBag size={18} />
                <span className="text-[9px]">Shop</span>
              </button>

              <button 
                onClick={() => setMobileTab('dashboard')}
                className={`flex flex-col items-center gap-0.5 transition-colors ${mobileTab === 'dashboard' ? 'text-primary font-bold' : 'text-gray-400'}`}
              >
                <LayoutDashboard size={18} />
                <span className="text-[9px]">Dashboard</span>
              </button>

              <button 
                onClick={() => setMobileTab('docs')}
                className={`flex flex-col items-center gap-0.5 transition-colors ${mobileTab === 'docs' ? 'text-primary font-bold' : 'text-gray-400'}`}
              >
                <BookOpen size={18} />
                <span className="text-[9px]">Docs & ERD</span>
              </button>
            </div>

            {/* Home Indicator Line */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-300 z-50"></div>
          </div>

          {/* Helper panel */}
          <div className="hidden xl:block absolute right-8 top-1/3 bg-gray-800/80 backdrop-blur border border-gray-700 text-white p-5 max-w-xs space-y-3">
            <h4 className="font-extrabold text-xs text-accent uppercase tracking-wider">Mobile App Preview</h4>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              This emulator displays how the marketplace, dashboard, and developer portal adapt dynamically for low-bandwidth mobile networks in Ghana.
            </p>
            <div className="text-[10px] text-gray-400 border-t border-gray-700 pt-2">
              Current active role: <strong>{activeRole.toUpperCase()}</strong>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Content Workspace */
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            {renderDesktopContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppShell;
