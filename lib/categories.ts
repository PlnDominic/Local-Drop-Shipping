import type React from 'react';
import { Baby, Gift, Heart, LayoutGrid, Package, Shirt, Smartphone, Sprout, Star, Tag, Utensils, Zap } from 'lucide-react';

export interface HeaderCategory {
  id: string;
  label: string;
  /** URL-friendly name used in shareable links, e.g. /marketplace?category=electronics */
  slug: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ICONS: Record<string, HeaderCategory['icon']> = {
  Zap, Heart, Star, Package, Gift, Tag, Shirt, Smartphone, Baby, Sprout, Utensils, LayoutGrid,
};

const BY_SLUG_HINT: [RegExp, HeaderCategory['icon']][] = [
  [/electr|phone|gadget|tech/, Zap],
  [/fashion|cloth|wear|shoe/, Shirt],
  [/beauty|cosmetic|skin/, Star],
  [/home|living|furnit|kitchen/, Package],
  [/health|medic|well/, Gift],
  [/food|grocer|drink/, Utensils],
  [/baby|kid|child/, Baby],
  [/agri|farm|plant/, Sprout],
];

function iconFor(name: string, slug: string): HeaderCategory['icon'] {
  if (ICONS[name]) return ICONS[name];
  const hit = BY_SLUG_HINT.find(([re]) => re.test(slug.toLowerCase()));
  return hit ? hit[1] : Tag;
}

/** "All" plus the real categories from the database (so filters match real product category ids). */
export function buildHeaderCategories(categories: { id: string; name: string; slug: string; icon: string }[]): HeaderCategory[] {
  return [
    { id: 'all', label: 'All Categories', slug: 'all', icon: LayoutGrid },
    ...categories.map((c) => ({ id: c.id, label: c.name, slug: c.slug, icon: iconFor(c.icon, c.slug) })),
  ];
}
