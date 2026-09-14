'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthProvider';
import { DropshipperDashboard } from '../../views/DropshipperDashboard';
import { DropshipperRegister } from '../../views/DropshipperRegister';
import { Navigation } from '../../components/Navigation';
import { supabase } from '../../lib/supabase/client';
import { ArrowLeft, ArrowRight, User } from 'lucide-react';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]';
const labelClass =
  'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

export default function DropshipperPage() {
  const router = useRouter();
  const { session, profile, loading, refreshProfile } = useAuth();

  const [storeName, setStoreName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session && profile && (profile.role === 'dropshipper' || profile.role === 'admin')) {
    return (
      <>
        <Navigation />
        <DropshipperDashboard />
      </>
    );
  }

  // Logged in as customer → show upgrade form
  if (session && profile && profile.role === 'customer') {
    const estimatedSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);

    const handleUpgrade = async () => {
      if (!storeName.trim()) {
        setError('Please enter a store name.');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        const { data: slug, error: slugError } = await supabase.rpc('generate_store_slug', {
          base_name: storeName.trim(),
        });
        if (slugError) throw slugError;

        const { error: roleError } = await supabase
          .from('users')
          .update({ role: 'dropshipper' })
          .eq('id', profile.id);
        if (roleError) throw roleError;

        const { error: profileError } = await supabase.from('dropshipper_profiles').upsert({
          id: profile.id,
          business_name: storeName.trim(),
          store_name: storeName.trim(),
          store_slug: slug,
          is_approved: true,
        });
        if (profileError) throw profileError;

        await refreshProfile();
        window.location.href = '/dropshipper';
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Something went wrong.';
        setError(message + ' Make sure the schema SQL has been applied to your Supabase project.');
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#F9FAFB] font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-1 text-[12px] text-[#777] hover:text-[#151515]"
            >
              <ArrowLeft size={13} /> Back to marketplace
            </button>
          </div>

          <h2 className="text-[24px] font-black text-[#151515]">Become a Dropshipper</h2>
          <p className="text-[13px] text-[#888] mt-1 mb-6">
            You're signed in as {profile.fullName || profile.email}. Set your store name
            to start selling. A unique store URL will be generated for you.
          </p>

          {error && (
            <div className="mb-4 rounded bg-red-50 px-3 py-2.5 text-[12px] text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                <User size={10} className="inline mr-1" />Store / Business Name
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={profile.fullName || 'My Store'}
                className={inputClass}
              />
            </div>

            {storeName.trim() && estimatedSlug && (
              <div className="p-3 rounded bg-[#f7f7f7] border border-gray-200">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#999] mb-1">
                  Store URL
                </p>
                <p className="text-[12px] text-[#151515] font-mono break-all">
                  {window.location.origin}/store/{estimatedSlug}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={submitting}
              className="w-full h-11 rounded bg-[#f04438] text-[13px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {submitting ? 'Setting up store…' : 'Create My Store'}
              {!submitting && <ArrowRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in → show full registration
  return <DropshipperRegister />;
}
