'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'ldsgh_datasaver';
const listeners = new Set<() => void>();

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

function read(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* storage blocked: fall through to the browser hint */
  }
  // Respect the phone's own Data Saver setting until the shopper chooses.
  return (navigator as NavigatorWithConnection).connection?.saveData === true;
}

export function setDataSaver(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* kept for this visit only */
  }
  memory = on;
  listeners.forEach((l) => l());
}

let memory: boolean | null = null;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { memory = null; cb(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

const snapshot = (): boolean => (memory ??= read());

/** True when the shopper turned on Data saver (or their phone asks for it). */
export function useDataSaver(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
