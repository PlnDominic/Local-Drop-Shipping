import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase.db
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException(`Category ${id} not found.`);
    return data;
  }

  async create(dto: CreateCategoryDto) {
    const { data, error } = await this.supabase.db
      .from('categories')
      .insert({
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        image_url: dto.imageUrl ?? null,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    const fields: Record<string, unknown> = {};
    if (dto.name !== undefined) fields['name'] = dto.name;
    if (dto.slug !== undefined) fields['slug'] = dto.slug;
    if (dto.description !== undefined) fields['description'] = dto.description;
    if (dto.imageUrl !== undefined) fields['image_url'] = dto.imageUrl;

    const { data, error } = await this.supabase.db
      .from('categories')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.db
      .from('categories')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Category deactivated.' };
  }
}
