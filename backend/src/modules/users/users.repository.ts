import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { UserEntity } from './entities/user.entity';

const PUBLIC_FIELDS = 'id, email, phone, full_name, role, avatar_url, is_verified, created_at';

@Injectable()
export class UsersRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string): Promise<UserEntity> {
    const { data, error } = await this.supabase.db
      .from('users')
      .select(PUBLIC_FIELDS)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`User ${id} not found.`);
    return data as UserEntity;
  }

  async findAll(page: number, limit: number) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase.db
      .from('users')
      .select(PUBLIC_FIELDS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) };
  }

  async update(id: string, fields: Partial<{ full_name: string; phone: string; avatar_url: string }>) {
    const { data, error } = await this.supabase.db
      .from('users')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(PUBLIC_FIELDS)
      .single();

    if (error || !data) throw new NotFoundException('User not found.');
    return data as UserEntity;
  }
}
