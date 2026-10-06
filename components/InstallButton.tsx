'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** "Install app" button; appears only when the browser says the site can be installed. */
export const InstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [evt, setEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    const onInstalled = () => setEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!evt) return null;
  return (
    <button
      type="button"
      onClick={async () => { await evt.prompt(); await evt.userChoice.catch(() => undefined); setEvt(null); }}
      className={`inline-flex items-center gap-1.5 hover:text-[#f04438] transition-colors ${className}`}
    >
      <Download size={13} /> Install app
    </button>
  );
};
