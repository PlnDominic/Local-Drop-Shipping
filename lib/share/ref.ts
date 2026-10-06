const KEY = 'ldsgh_ref';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Remembers which share link brought this visitor, so a later order can be credited to it. */
export function rememberRef(code: string): void {
  try {
    if (/^[a-z0-9]{6,12}$/i.test(code)) localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* storage blocked: sharing still works, only attribution is lost */
  }
}

export function currentRef(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code: string; at: number };
    return Date.now() - at < MAX_AGE_MS ? code : null;
  } catch {
    return null;
  }
}
