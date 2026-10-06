'use client';

import React, { useState } from 'react';
import { Copy, Facebook, Instagram, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../Toast';

type Channel = 'whatsapp' | 'facebook' | 'instagram' | 'other';

/** Tracked share buttons: each channel gets its own link so we can tell which one sells. */
export const ShareButtons: React.FC<{
  /** products.id, or null to share the whole store */
  productId: string | null;
  title: string;
  onShared?: () => void;
}> = ({ productId, title, onShared }) => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<Channel | null>(null);

  const go = async (channel: Channel) => {
    setBusy(channel);
    const { data, error } = await supabase.rpc('get_or_create_share_link', { p_product_id: productId, p_channel: channel });
    setBusy(null);
    if (error || typeof data !== 'string') {
      showToast(error?.message || 'Could not create the link. Apply the engagement database update first.', 'error');
      return;
    }
    const link = `${window.location.origin}/s/${data}`;
    const text = `${title} - order on Local Drop Shipping GH: ${link}`;

    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    } else if (channel === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank', 'noopener,noreferrer');
    } else {
      // Instagram has no web share link: copy it for the bio, story sticker or a DM.
      try {
        await navigator.clipboard.writeText(link);
        showToast(channel === 'instagram' ? 'Link copied. Paste it in your Instagram bio or story.' : 'Link copied.', 'success');
      } catch {
        window.prompt('Copy this link', link);
      }
    }
    onShared?.();
  };

  const btn = 'inline-flex h-8 items-center gap-1.5 rounded border border-gray-200 px-2.5 text-[11px] font-black text-[#151515] hover:border-[#f04438] hover:text-[#f04438] disabled:opacity-50';
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`Share ${title}`}>
      <button type="button" className={btn} disabled={busy !== null} onClick={() => go('whatsapp')}><MessageCircle size={13} /> WhatsApp</button>
      <button type="button" className={btn} disabled={busy !== null} onClick={() => go('facebook')}><Facebook size={13} /> Facebook</button>
      <button type="button" className={btn} disabled={busy !== null} onClick={() => go('instagram')}><Instagram size={13} /> Instagram</button>
      <button type="button" className={btn} disabled={busy !== null} onClick={() => go('other')} aria-label="Copy link"><Copy size={13} /></button>
    </div>
  );
};
