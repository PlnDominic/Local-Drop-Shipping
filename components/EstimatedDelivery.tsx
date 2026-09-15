import { Truck } from 'lucide-react';

interface EstimatedDeliveryProps {
  estimate: string | null | undefined;
  loading?: boolean;
}

export function EstimatedDelivery({ estimate, loading }: EstimatedDeliveryProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#999]">
        <div className="h-4 w-4 rounded-full border-2 border-[#f04438] border-t-transparent animate-spin" />
        Calculating delivery…
      </div>
    );
  }

  if (!estimate) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#f04438]/5 border border-[#f04438]/10 px-3 py-2.5">
      <Truck size={15} className="text-[#f04438] shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">
          Estimated Delivery
        </p>
        <p className="text-sm font-black text-[#151515]">{estimate}</p>
      </div>
    </div>
  );
}
