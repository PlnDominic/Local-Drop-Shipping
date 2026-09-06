#!/usr/bin/env node
/**
 * Keeps the Supabase project active by performing a handful of lightweight
 * read queries against it. Supabase's free tier auto-pauses a project after
 * ~7 days with no API activity — this script exists purely to generate that
 * activity so the project never gets paused.
 *
 * Run manually:
 *   node scripts/keep-supabase-alive.mjs
 *
 * Run automatically:
 *   .github/workflows/supabase-keep-alive.yml schedules this every Monday.
 *
 * Required environment variables (see .env.example):
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

// supabase-js always constructs a RealtimeClient, even though this script
// only does plain REST reads, and that constructor throws on any runtime
// without a global `WebSocket` (Node < 22). Polyfill it with the `ws`
// package so this works regardless of which Node version actually runs it.
if (typeof globalThis.WebSocket === 'undefined') {
  const { default: WebSocket } = await import('ws');
  globalThis.WebSocket = WebSocket;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[keep-alive] Missing Supabase credentials. Set SUPABASE_URL and one of ' +
      'SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY (as repo/env secrets).',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Small, cheap reads across a few tables — enough to register as real API
// activity without pulling any meaningful amount of data or rows.
const CHECKS = [
  { label: 'categories', table: 'categories' },
  { label: 'products', table: 'products' },
  { label: 'users', table: 'users' },
];

async function pingTable({ label, table }) {
  const started = Date.now();
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  const ms = Date.now() - started;

  if (error) {
    // A missing/renamed table shouldn't fail the whole run — log and move on,
    // as long as at least one check in the run succeeds.
    console.warn(`[keep-alive] ${label}: query failed (${ms}ms) — ${error.message}`);
    return false;
  }

  console.log(`[keep-alive] ${label}: ok (${ms}ms, count=${count ?? 'n/a'})`);
  return true;
}

async function main() {
  console.log(`[keep-alive] pinging ${supabaseUrl} at ${new Date().toISOString()}`);

  const results = await Promise.all(CHECKS.map(pingTable));
  const anySucceeded = results.some(Boolean);

  if (!anySucceeded) {
    console.error('[keep-alive] all queries failed — Supabase project may be unreachable.');
    process.exit(1);
  }

  console.log('[keep-alive] done.');
}

main().catch((err) => {
  console.error('[keep-alive] unexpected error:', err);
  process.exit(1);
});
