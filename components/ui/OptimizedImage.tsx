'use client';

import React, { useState } from 'react';
import { ImageOff, ImageDown } from 'lucide-react';
import { useDataSaver } from '../../lib/dataSaver';

/** Sizes an Unsplash photo to what the screen needs. Other hosts are served as uploaded
 *  (supplier uploads are already compressed in the browser before they are stored). */
export function optimizedSrc(src: string, width: number, saver: boolean): { src: string; resized: boolean } {
  try {
    const u = new URL(src);
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', String(saver ? Math.min(width, 400) : width * 2));
      u.searchParams.set('q', saver ? '50' : '70');
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'max');
      return { src: u.toString(), resized: true };
    }
  } catch {
    /* relative or invalid URL: leave it alone */
  }
  return { src, resized: false };
}

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> {
  src: string;
  alt: string;
  /** Approximate displayed width in CSS pixels; used to request a right-sized photo. */
  width?: number;
  /** Above-the-fold image: load immediately. */
  priority?: boolean;
}

/**
 * Lazy-loaded product photo with a fallback. With Data saver on, photos we cannot shrink
 * wait behind a tap instead of downloading automatically.
 */
export const OptimizedImage: React.FC<Props> = ({ src, alt, width = 400, priority = false, className, ...rest }) => {
  const saver = useDataSaver();
  const [failed, setFailed] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const { src: finalSrc, resized } = optimizedSrc(src, width, saver);

  if (failed) {
    return <span className="grid h-full w-full place-items-center text-gray-300" role="img" aria-label={alt}><ImageOff size={22} /></span>;
  }
  if (saver && !resized && !allowed && !priority) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAllowed(true); }}
        className="grid h-full w-full place-items-center bg-gray-50 text-[10px] font-bold text-gray-500"
        aria-label={`Load photo: ${alt}`}
      >
        <span className="flex flex-col items-center gap-1"><ImageDown size={20} /> Tap to load</span>
      </button>
    );
  }
  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
