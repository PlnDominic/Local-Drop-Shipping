'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useGlobalStore } from '../store/globalStore';
import { useToast } from './Toast';

/** Heart toggle that saves a store item to the signed-in customer's "Saved items". */
export const SaveButton: React.FC<{
  dropshipperProductId: string;
  /** "icon" is the small round button used on cards; "pill" is a labelled button for pages. */
  variant?: 'icon' | 'pill';
  className?: string;
}> = ({ dropshipperProductId, variant = 'icon', className = '' }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const saved = useGlobalStore((s) => s.savedIds.includes(dropshipperProductId));
  const signedIn = useGlobalStore((s) => !!s.currentUserId);
  const toggleSaved = useGlobalStore((s) => s.toggleSaved);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      showToast('Sign in to save items for later.', 'info');
      router.push('/login');
      return;
    }
    const res = await toggleSaved(dropshipperProductId);
    if (!res.ok) showToast(res.error || 'Could not update your saved items.', 'error');
    else showToast(res.saved ? 'Saved for later.' : 'Removed from saved items.', 'success');
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={`inline-flex h-11 items-center gap-2 rounded border px-4 text-[12px] font-black transition-colors ${
          saved ? 'border-[#f04438] bg-[#f04438]/10 text-[#f04438]' : 'border-gray-200 text-[#555] hover:border-[#f04438] hover:text-[#f04438]'
        } ${className}`}
      >
        <Heart size={15} className={saved ? 'fill-[#f04438]' : ''} /> {saved ? 'Saved' : 'Save for later'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved items' : 'Save for later'}
      className={`grid h-8 w-8 place-items-center rounded-full bg-white shadow transition-colors ${className}`}
    >
      <Heart size={14} className={saved ? 'fill-[#f04438] text-[#f04438]' : 'text-gray-400 hover:text-[#f04438]'} />
    </button>
  );
};
