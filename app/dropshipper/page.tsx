'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useGlobalStore } from '../../store/globalStore';
import { DropshipperDashboard } from '../../views/DropshipperDashboard';
import { DropshipperRegister } from '../../views/DropshipperRegister';
import { SiteHeader } from '../../components/SiteHeader';
import { supabase } from '../../lib/supabase/client';
import { ArrowLeft, ArrowRight, User } from 'lucide-react';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]';
const labelClass =
  'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

/**
 * "Set up your store" step — shown to anyone who has the dropshipper role
 * but no dropshipper_profiles row yet (a direct signup via DropshipperRegister
 * never creates one), or to a customer applying to become a dropshipper
 * (which also needs the role flipped first).
 */
const CreateStoreForm: React.FC<{ needsRoleUpdate: boolean }> = ({ needsRoleUpdate }) => {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const [storeName, setStoreName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const estimatedSlug = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

  const handleCreate = async () => {
    if (!profile) return;
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

      if (needsRoleUpdate) {
        const { error: roleError } = await supabase
          .from('users')
          .update({ role: 'dropshipper' })
          .eq('id', profile.id);
        if (roleError) throw roleError;
      }

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

        <h2 className="text-[24px] font-black text-[#151515]">
          {needsRoleUpdate ? 'Become a Dropshipper' : 'Set up your store'}
        </h2>
        <p className="text-[13px] text-[#888] mt-1 mb-6">
          You're signed in as {profile?.fullName || profile?.email}. Set your store name
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
              placeholder={profile?.fullName || 'My Store'}
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
            onClick={handleCreate}
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
};

export default function DropshipperPage() {
  const { session, profile, loading } = useAuth();
  const { hydrated, dropshipperProfile } = useGlobalStore();

  if (loading || (session && !hydrated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    return <DropshipperRegister />;
  }

  if (profile.role === 'admin') {
    return (
      <>
        <SiteHeader />
        <DropshipperDashboard />
      </>
    );
  }

  if (profile.role === 'dropshipper') {
    // Directly-registered dropshippers never went through store setup — send
    // them there first so they always have a working storefront URL.
    if (!dropshipperProfile) return <CreateStoreForm needsRoleUpdate={false} />;
    return (
      <>
        <SiteHeader />
        <DropshipperDashboard />
      </>
    );
  }

  // Signed in as a customer (or supplier) → offer to become a dropshipper.
  return <CreateStoreForm needsRoleUpdate />;
}
