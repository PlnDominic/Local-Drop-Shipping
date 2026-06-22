'use client';

import { useAuth } from '../../../lib/auth/AuthProvider';
import { DropshipperDashboard } from '../../../views/DropshipperDashboard';
import { DropshipperRegister } from '../../../views/DropshipperRegister';

export default function DropshipperPage() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Show dashboard only for authenticated dropshippers (and admins)
  if (session && profile && (profile.role === 'dropshipper' || profile.role === 'admin')) {
    return <DropshipperDashboard />;
  }

  // Everyone else (not logged in, or logged in as customer/supplier) sees the registration form
  return <DropshipperRegister />;
}
