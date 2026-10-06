'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchDeliveryQuote,
  formatDeliveryEta,
  GHANA_REGIONS,
  isValidGhanaPostGps,
  normalizeGhanaPostGps,
  type DeliveryQuote,
  type QuoteResult,
} from '../../lib/checkout';

interface DeliveryFieldsProps {
  /** Called whenever the region/city change with the matching delivery quote (null until known). */
  onQuoteChange: (quote: DeliveryQuote | null, status: QuoteResult['status'] | 'idle') => void;
  /** Visual tweaks so the same fields fit both checkouts. */
  inputClassName: string;
  labelClassName: string;
  accentColor?: string;
}

/**
 * Region, city and GhanaPost GPS inputs for checkout. Uses native form names
 * (region, city, ghanaPostGps) so the parent can read them from FormData, and
 * shows the live delivery fee and estimate for the chosen area.
 */
export const DeliveryFields: React.FC<DeliveryFieldsProps> = ({
  onQuoteChange,
  inputClassName,
  labelClassName,
  accentColor = '#f04438',
}) => {
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [gps, setGps] = useState('');
  const [gpsTouched, setGpsTouched] = useState(false);
  const [result, setResult] = useState<QuoteResult | 'idle' | 'loading'>('idle');

  useEffect(() => {
    if (!region) {
      setResult('idle');
      onQuoteChange(null, 'idle');
      return;
    }
    let cancelled = false;
    setResult('loading');
    const timer = setTimeout(async () => {
      const res = await fetchDeliveryQuote(region, city.trim());
      if (cancelled) return;
      setResult(res);
      onQuoteChange(res.status === 'ok' ? res.quote : null, res.status);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // onQuoteChange is a state setter wrapper from the parent; re-running on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, city]);

  const gpsInvalid = gpsTouched && gps.trim() !== '' && !isValidGhanaPostGps(gps);

  return (
    <>
      <label className="grid gap-1">
        <span className={labelClassName}>Region</span>
        <select
          name="region"
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={inputClassName}
        >
          <option value="">Select your region</option>
          {GHANA_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className={labelClassName}>City / town</span>
        <input
          name="city"
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Madina"
          autoComplete="address-level2"
          className={inputClassName}
        />
      </label>

      <label className="grid gap-1 sm:col-span-2">
        <span className={labelClassName}>GhanaPost GPS address</span>
        <input
          name="ghanaPostGps"
          required
          value={gps}
          onChange={(e) => setGps(e.target.value)}
          onBlur={() => {
            setGpsTouched(true);
            if (isValidGhanaPostGps(gps)) setGps(normalizeGhanaPostGps(gps));
          }}
          placeholder="GA-184-9022"
          autoComplete="off"
          aria-invalid={gpsInvalid}
          className={`${inputClassName} uppercase ${gpsInvalid ? '!border-red-500' : ''}`}
        />
        {gpsInvalid ? (
          <span className="text-[11px] font-semibold text-red-600">
            That doesn&apos;t look like a GhanaPost GPS code. It is 2–3 letters, then 3–4 digits, then 4 digits, like GA-184-9022.
          </span>
        ) : (
          <span className="text-[11px] font-normal text-[#999]">
            Find yours in the GhanaPostGPS app. Riders use it to find your door.
          </span>
        )}
      </label>

      <div className="sm:col-span-2 -mt-1 text-[12px]" aria-live="polite">
        {result === 'loading' && <span className="text-[#999]">Checking delivery to {region}…</span>}
        {typeof result === 'object' && result.status === 'ok' && (
          <span className="font-semibold text-[#444]">
            Delivery to {region}:{' '}
            <span style={{ color: accentColor }} className="font-black">GHS {result.quote.fee.toFixed(2)}</span>
            {' · '}arrives in about {formatDeliveryEta(result.quote)}
          </span>
        )}
        {typeof result === 'object' && result.status === 'not_served' && (
          <span className="font-semibold text-red-600">We don&apos;t deliver to {region} yet. Please choose another region.</span>
        )}
        {result === 'idle' && <span className="text-[#999]">Choose your region to see the delivery fee and time.</span>}
      </div>
    </>
  );
};
