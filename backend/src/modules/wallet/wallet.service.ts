import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

export type TransactionType = 'credit' | 'debit' | 'commission' | 'withdrawal';

/** Max optimistic-concurrency retries when a concurrent balance change is detected. */
const MAX_CAS_RETRIES = 5;

@Injectable()
export class WalletService {
  constructor(private readonly supabase: SupabaseService) {}

  async getBalance(userId: string) {
    const { data, error } = await this.supabase.db
      .from('wallets')
      .select('balance, currency')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      const { data: created, error: createErr } = await this.supabase.db
        .from('wallets')
        .insert({ user_id: userId, balance: 0, currency: 'GHS' })
        .select()
        .single();
      if (createErr) throw new Error(createErr.message);
      return created;
    }
    return data;
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }

  async credit(userId: string, amount: number, description: string, type: TransactionType = 'credit') {
    if (!(amount > 0)) throw new BadRequestException('Credit amount must be positive.');

    const newBalance = await this.adjustBalance(userId, amount);

    const { data } = await this.supabase.db
      .from('wallet_transactions')
      .insert({ user_id: userId, type, amount, description, balance_after: newBalance })
      .select()
      .single();

    return data;
  }

  async withdraw(userId: string, amount: number, accountDetails: Record<string, string>) {
    if (!(amount > 0)) throw new BadRequestException('Withdrawal amount must be positive.');

    const newBalance = await this.adjustBalance(userId, -amount);

    const { data } = await this.supabase.db
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'withdrawal',
        amount: -amount,
        description: `Withdrawal to ${accountDetails['accountNumber'] ?? 'account'}`,
        balance_after: newBalance,
        meta: accountDetails,
      })
      .select()
      .single();

    return data;
  }

  /**
   * Atomically applies `delta` to a wallet balance using optimistic concurrency
   * (compare-and-swap on the previously read balance). This prevents the lost-update
   * / double-spend race that a plain read-modify-write would allow under concurrency.
   * Throws if the wallet would go negative.
   */
  private async adjustBalance(userId: string, delta: number): Promise<number> {
    for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
      const wallet = await this.getBalance(userId);
      const current = Number(wallet.balance);
      const next = parseFloat((current + delta).toFixed(2));

      if (next < 0) {
        throw new BadRequestException('Insufficient wallet balance.');
      }

      // Only succeeds if the balance hasn't changed since we read it.
      const { data, error } = await this.supabase.db
        .from('wallets')
        .update({ balance: next, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('balance', current)
        .select('balance');

      if (error) throw new Error(error.message);
      if (data && data.length === 1) return next;
      // Otherwise a concurrent update changed the balance — retry with fresh state.
    }

    throw new BadRequestException('Wallet is busy, please retry.');
  }
}
