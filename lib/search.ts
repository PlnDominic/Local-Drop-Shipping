/**
 * Small typo-tolerant product search that runs in the browser.
 *
 * Every word the shopper types must match something on the product (name, SKU,
 * category, supplier/store, description). A word matches when it is:
 *   - exactly a word on the product            (strongest)
 *   - the start of a word ("earb" -> "earbuds")
 *   - contained in a word ("phone" -> "headphones")
 *   - a near-miss spelling ("erbuds", "samsng", "blutooth")  (weakest)
 * Results are ranked by how well, and where, the words matched. Name matches
 * count the most, descriptions the least.
 */

export interface SearchFields {
  name: string;
  sku?: string;
  category?: string;
  supplier?: string;
  store?: string;
  description?: string;
}

const WEIGHTS: Record<keyof SearchFields, number> = {
  name: 3,
  sku: 2.5,
  category: 1.4,
  supplier: 1.2,
  store: 1.2,
  description: 0.6,
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Damerau-Levenshtein distance (insert, delete, replace, swap neighbours), bailing out above `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) rows.push([i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = d;
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/** How many spelling mistakes we forgive for a word of this length. */
function allowedTypos(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

type MatchKind = 'exact' | 'prefix' | 'contains' | 'fuzzy';
const KIND_SCORE: Record<MatchKind, number> = { exact: 1, prefix: 0.85, contains: 0.55, fuzzy: 0.4 };

function matchWord(q: string, word: string): MatchKind | null {
  if (q === word) return 'exact';
  if (q.length >= 2 && word.startsWith(q)) return 'prefix';
  if (q.length >= 3 && word.includes(q)) return 'contains';
  const typos = allowedTypos(q.length);
  if (typos > 0) {
    if (editDistance(q, word, typos) <= typos) return 'fuzzy';
    // Allow a half-typed word with a typo, e.g. "samsn" vs "samsung".
    if (word.length > q.length && editDistance(q, word.slice(0, q.length), typos) <= typos) return 'fuzzy';
  }
  return null;
}

export interface IndexedItem<T> {
  item: T;
  order: number;
  fields: { weight: number; words: string[] }[];
}

export function buildIndex<T>(items: T[], toFields: (item: T) => SearchFields): IndexedItem<T>[] {
  return items.map((item, order) => {
    const f = toFields(item);
    return {
      item,
      order,
      fields: (Object.keys(WEIGHTS) as (keyof SearchFields)[])
        .map((key) => ({ weight: WEIGHTS[key], words: tokenize(f[key] ?? '') }))
        .filter((x) => x.words.length > 0),
    };
  });
}

export interface SearchResult<T> {
  results: T[];
  /** True when results only exist because of forgiven spelling mistakes. */
  usedSpellingTolerance: boolean;
}

export function runSearch<T>(index: IndexedItem<T>[], query: string): SearchResult<T> {
  const words = tokenize(query);
  if (words.length === 0) return { results: index.map((i) => i.item), usedSpellingTolerance: false };

  const scored: { item: T; order: number; score: number; fuzzyOnly: boolean }[] = [];
  for (const entry of index) {
    let total = 0;
    let anyFuzzy = false;
    let allMatched = true;
    for (const q of words) {
      let best = 0;
      let bestKind: MatchKind | null = null;
      for (const field of entry.fields) {
        for (const w of field.words) {
          const kind = matchWord(q, w);
          if (!kind) continue;
          const s = KIND_SCORE[kind] * field.weight;
          if (s > best) {
            best = s;
            bestKind = kind;
          }
        }
      }
      if (!bestKind) {
        allMatched = false;
        break;
      }
      if (bestKind === 'fuzzy') anyFuzzy = true;
      total += best;
    }
    if (allMatched) scored.push({ item: entry.item, order: entry.order, score: total, fuzzyOnly: anyFuzzy });
  }

  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  // Spelling tolerance "was used" when nothing matched cleanly.
  const usedSpellingTolerance = scored.length > 0 && scored.every((s) => s.fuzzyOnly);
  return { results: scored.map((s) => s.item), usedSpellingTolerance };
}
