import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('supabase.url');
    const key = this.config.getOrThrow<string>('supabase.key');
    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  get db(): SupabaseClient {
    return this.client;
  }
}
