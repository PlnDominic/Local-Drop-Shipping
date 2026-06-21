import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

export type TransactionType = 'credit' | 'debit' | 'commission' | 'withdrawal';

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
    const wallet = await this.getBalance(userId);
    const newBalance = Number(wallet.balance) + amount;

    await this.supabase.db
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    const { data } = await this.supabase.db
      .from('wallet_transactions')
      .insert({ user_id: userId, type, amount, description, balance_after: newBalance })
      .select()
      .single();

    return data;
  }

  async withdraw(userId: string, amount: number, accountDetails: Record<string, string>) {
    const wallet = await this.getBalance(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    const newBalance = Number(wallet.balance) - amount;

    await this.supabase.db
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

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
}
