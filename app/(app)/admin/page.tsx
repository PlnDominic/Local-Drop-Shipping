'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useGlobalStore } from '../../../store/globalStore';
import { AdminDashboard } from '../../../views/AdminDashboard';

export default function AdminPage() {
  const { session, profile, loading } = useAuth();
  const hydrated = useGlobalStore((s) => s.hydrated);

  if (loading || (session && !hydrated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session || !profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-black text-[#151515]">Admins Only</h1>
          <p className="mt-2 text-sm text-[#777]">
            {session
              ? "You're signed in, but this account doesn't have admin access."
              : 'Sign in with an admin account to reach the Platform Control Center.'}
          </p>
          <Link
            href="/"
            className="mt-5 inline-block h-11 rounded-lg px-6 text-[12px] font-black text-white leading-[44px] transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#151515' }}
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}
