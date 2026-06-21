'use client';

import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { Navigation } from './Navigation';
import { LandingPage } from '../views/LandingPage';
import { Marketplace } from '../views/Marketplace';
import { DropshipperDashboard } from '../views/DropshipperDashboard';
import { SupplierDashboard } from '../views/SupplierDashboard';
import { AdminDashboard } from '../views/AdminDashboard';
import { DiagramsAndDocs } from '../views/DiagramsAndDocs';

const AppShell: React.FC = () => {
  const { setActiveRole } = useGlobalStore();
  const [activePage, setActivePage] = useState<string>('home');

  const handleSetActivePage = (page: string) => {
    setActivePage(page);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <LandingPage
            onJoinAsDropshipper={() => {
              setActiveRole('dropshipper');
              setActivePage('dropshipper');
            }}
            onBrowseMarketplace={() => {
              setActiveRole('customer');
              setActivePage('marketplace');
            }}
          />
        );
      case 'marketplace':
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
        return (
          <LandingPage
            onJoinAsDropshipper={() => {
              setActiveRole('dropshipper');
              setActivePage('dropshipper');
            }}
            onBrowseMarketplace={() => {
              setActiveRole('customer');
              setActivePage('marketplace');
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation activePage={activePage} setActivePage={handleSetActivePage} />
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
};

export default AppShell;
