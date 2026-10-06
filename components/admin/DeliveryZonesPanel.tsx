'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { GHANA_REGIONS } from '../../lib/checkout';
import { useToast } from '../Toast';

interface Zone {
  id: string;
  region: string;
  city: string | null;
  fee: number;
  min_days: number;
  max_days: number;
  is_active: boolean;
}

const cell = 'h-9 w-full rounded border border-gray-200 px-2 text-[12px] bg-white outline-none focus:border-[#f04438]';

/** Admin editor for delivery fees and estimates by region (and optional city overrides). */
export const DeliveryZonesPanel: React.FC = () => {
  const { showToast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Zone>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState({ region: '', city: '', fee: '', min: '1', max: '3' });

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('delivery_zones')
      .select('id, region, city, fee, min_days, max_days, is_active')
      .order('region')
      .order('city', { ascending: true, nullsFirst: true });
    if (err) setError('Could not load delivery zones. Apply supabase/launch-features.sql first.');
    else {
      setError('');
      setZones((data as Zone[]).map((z) => ({ ...z, fee: Number(z.fee) })));
      setEdits({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const edit = (id: string, patch: Partial<Zone>) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  const save = async (z: Zone) => {
    const merged = { ...z, ...edits[z.id] };
    if (!(merged.fee >= 0) || merged.max_days < merged.min_days) {
      showToast('Check the fee and that the maximum days is not below the minimum.', 'error');
      return;
    }
    const { error: err } = await supabase
      .from('delivery_zones')
      .update({ fee: merged.fee, min_days: merged.min_days, max_days: merged.max_days, is_active: merged.is_active, updated_at: new Date().toISOString() })
      .eq('id', z.id);
    if (err) return showToast(err.message, 'error');
    showToast(`Saved ${z.city ? `${z.city}, ` : ''}${z.region}.`, 'success');
    load();
  };

  const remove = async (z: Zone) => {
    if (!window.confirm(`Delete the ${z.city ? `${z.city} (${z.region})` : z.region} delivery rate?`)) return;
    const { error: err } = await supabase.from('delivery_zones').delete().eq('id', z.id);
    if (err) return showToast(err.message, 'error');
    load();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(adding.fee);
    if (!adding.region || !(fee >= 0) || adding.fee === '') return showToast('Choose a region and enter a fee.', 'error');
    const { error: err } = await supabase.from('delivery_zones').insert({
      region: adding.region,
      city: adding.city.trim() || null,
      fee,
      min_days: Number(adding.min),
      max_days: Number(adding.max),
    });
    if (err) return showToast(err.message.includes('duplicate') ? 'That region/city already has a rate.' : err.message, 'error');
    setAdding({ region: '', city: '', fee: '', min: '1', max: '3' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-[12px] text-[#5c4a00]">
        <strong>Review these before launch.</strong> The starting fees are placeholders. A city row (for example Kumasi) overrides
        its region&apos;s rate. Customers pay one delivery fee per store order, and a region with no active row can&apos;t be ordered to.
      </div>

      <section className="bg-white rounded border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-4 flex items-center gap-2">
          <Truck size={16} className="text-[#f04438]" />
          <h2 className="text-[15px] font-black text-[#151515]">Delivery fees &amp; times</h2>
        </div>

        {error ? (
          <div className="p-5"><div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">{error}</div></div>
        ) : loading ? (
          <div className="p-5 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-[#f7f7f7] border-b border-gray-100 text-[10px] text-[#999] font-black uppercase tracking-wider">
                  <th className="p-3">Region</th><th className="p-3">City</th><th className="p-3 w-28">Fee (GHS)</th>
                  <th className="p-3 w-20">Min days</th><th className="p-3 w-20">Max days</th><th className="p-3 w-20">Active</th><th className="p-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[12px]">
                {zones.map((z) => {
                  const v = { ...z, ...edits[z.id] };
                  const dirty = !!edits[z.id];
                  return (
                    <tr key={z.id} className={dirty ? 'bg-yellow-50/50' : ''}>
                      <td className="p-3 font-bold">{z.region}</td>
                      <td className="p-3 text-[#777]">{z.city || <span className="text-[#bbb]">All cities (default)</span>}</td>
                      <td className="p-3"><input type="number" min={0} step="0.5" value={v.fee} onChange={(e) => edit(z.id, { fee: Number(e.target.value) })} className={cell} aria-label={`Fee for ${z.region}`} /></td>
                      <td className="p-3"><input type="number" min={0} value={v.min_days} onChange={(e) => edit(z.id, { min_days: Number(e.target.value) })} className={cell} aria-label="Minimum days" /></td>
                      <td className="p-3"><input type="number" min={0} value={v.max_days} onChange={(e) => edit(z.id, { max_days: Number(e.target.value) })} className={cell} aria-label="Maximum days" /></td>
                      <td className="p-3"><input type="checkbox" checked={v.is_active} onChange={(e) => edit(z.id, { is_active: e.target.checked })} className="accent-[#f04438] h-4 w-4" aria-label="Active" /></td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => save(z)} disabled={!dirty} aria-label="Save" className="h-8 w-8 grid place-items-center rounded bg-[#151515] text-white hover:bg-[#f04438] disabled:opacity-30 transition-colors"><Save size={13} /></button>
                          <button type="button" onClick={() => remove(z)} aria-label="Delete" className="h-8 w-8 grid place-items-center rounded border border-gray-200 text-[#999] hover:text-red-600 hover:border-red-200 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && (
          <form onSubmit={add} className="border-t border-gray-100 bg-[#fafafa] p-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-[#999]">Add a rate</p>
            <div className="grid gap-2 sm:grid-cols-[1.2fr_1.2fr_100px_80px_80px_auto]">
              <select value={adding.region} onChange={(e) => setAdding({ ...adding, region: e.target.value })} className={cell} aria-label="Region" required>
                <option value="">Region</option>
                {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <input value={adding.city} onChange={(e) => setAdding({ ...adding, city: e.target.value })} placeholder="City (optional override)" className={cell} aria-label="City" />
              <input type="number" min={0} step="0.5" value={adding.fee} onChange={(e) => setAdding({ ...adding, fee: e.target.value })} placeholder="Fee" className={cell} aria-label="Fee" required />
              <input type="number" min={0} value={adding.min} onChange={(e) => setAdding({ ...adding, min: e.target.value })} className={cell} aria-label="Minimum days" />
              <input type="number" min={0} value={adding.max} onChange={(e) => setAdding({ ...adding, max: e.target.value })} className={cell} aria-label="Maximum days" />
              <button type="submit" className="h-9 rounded bg-[#f04438] px-4 text-[12px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1.5"><Plus size={13} /> Add</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
