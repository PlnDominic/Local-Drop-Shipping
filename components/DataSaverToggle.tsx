'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { setDataSaver, useDataSaver } from '../lib/dataSaver';

/** Lets shoppers on slow or expensive data load smaller photos (and tap to load the rest). */
export const DataSaverToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const on = useDataSaver();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setDataSaver(!on)}
      title="Load smaller photos to save mobile data"
      className={`inline-flex items-center gap-1.5 transition-colors hover:text-[#f04438] ${on ? 'text-[#f04438] font-black' : ''} ${className}`}
    >
      <Gauge size={13} /> Data saver: {on ? 'On' : 'Off'}
    </button>
  );
};
