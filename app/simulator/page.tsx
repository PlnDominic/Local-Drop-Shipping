'use client';

import { useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { useGlobalStore } from '../../store/globalStore';

export default function SimulatorPage() {
  const setMobilePreview = useGlobalStore((s) => s.setMobilePreview);

  // Land directly in the phone-frame preview when visiting the simulator.
  useEffect(() => {
    setMobilePreview(true);
    return () => setMobilePreview(false);
  }, [setMobilePreview]);

  return <AppShell />;
}
