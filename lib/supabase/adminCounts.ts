import { supabase } from './client';

/** Badge numbers for the admin tabs. Each count falls back to 0 if its table isn't set up yet. */
export async function getAdminCounts(): Promise<{ refunds: number; verifications: number; tickets: number }> {
  const count = async (table: string, column: string, values: string[]) => {
    const { count: n, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in(column, values);
    return error ? 0 : n ?? 0;
  };
  const pending = (table: string) =>
    supabase.from(table).select('status', { count: 'exact', head: true }).eq('status', 'pending');
  const [supplierV, dropshipperV] = await Promise.all([pending('supplier_verifications'), pending('dropshipper_verifications')]);
  const [refunds, tickets] = await Promise.all([
    count('refund_requests', 'status', ['requested', 'approved']),
    count('support_tickets', 'status', ['open', 'in_progress']),
  ]);
  return { refunds, verifications: (supplierV.error ? 0 : supplierV.count ?? 0) + (dropshipperV.error ? 0 : dropshipperV.count ?? 0), tickets };
}
