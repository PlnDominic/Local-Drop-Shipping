'use client';

import { useEffect } from 'react';
import { rememberRef } from '../../lib/share/ref';

/** Reads ?ref=CODE from the URL (set by /s/CODE links) and remembers it for attribution. */
export function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) rememberRef(ref);
  }, []);
  return null;
}
