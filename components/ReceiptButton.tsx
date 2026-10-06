'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadReceipt } from '../lib/receipts';
import { useToast } from './Toast';

/** Small "Receipt" link that downloads the order's PDF. */
export const ReceiptButton: React.FC<{ orderId: string; orderNumber: string }> = ({ orderId, orderNumber }) => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadReceipt(orderId, orderNumber);
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Could not download the receipt.', 'error');
        } finally {
          setBusy(false);
        }
      }}
      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#777] hover:text-[#f04438] transition-colors disabled:opacity-50"
    >
      <Download size={10} /> {busy ? 'Preparing…' : 'Receipt'}
    </button>
  );
};
