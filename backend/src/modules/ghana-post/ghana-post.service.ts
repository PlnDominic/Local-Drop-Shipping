import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';

export interface GhanaPostValidationResult {
  valid: boolean;
  gpsAddress: string;
  region: string | null;
  city: string | null;
  street: string | null;
  confidence: number;
  message?: string;
}

export interface GhanaPostSuggestion {
  gpsAddress: string;
  region: string | null;
  city: string | null;
  street: string | null;
  description: string;
}

@Injectable()
export class GhanaPostService {
  private readonly logger = new Logger(GhanaPostService.name);
  private readonly apiKey: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.apiKey = this.config.get<string>('app.ghanaPostApiKey');
  }

  private getGhanaPostBaseUrl(): string {
    return this.config.get<string>('app.ghanaPostBaseUrl') ?? 'https://api.ghanapostgps.com';
  }

  async validateAddress(gpsAddress: string): Promise<GhanaPostValidationResult> {
    const normalized = this.normalizeGpsAddress(gpsAddress);

    if (!this.isValidGpsFormat(normalized)) {
      return {
        valid: false,
        gpsAddress: normalized,
        region: null,
        city: null,
        street: null,
        confidence: 0,
        message: 'Invalid GhanaPost GPS format. Expected format: GA-XXX-XXXX (e.g. GA-184-9022)',
      };
    }

    if (!this.apiKey) {
      return this.fallbackValidation(normalized);
    }

    try {
      return await this.apiValidation(normalized);
    } catch (error) {
      this.logger.warn(`GhanaPost API validation failed, falling back: ${(error as Error)?.message ?? 'unknown error'}`);
      return this.fallbackValidation(normalized);
    }
  }

  async autocomplete(query: string): Promise<GhanaPostSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      return [];
    }

    if (!this.apiKey) {
      return this.fallbackAutocomplete(trimmed);
    }

    try {
      return await this.apiAutocomplete(trimmed);
    } catch (error) {
      this.logger.warn(`GhanaPost API autocomplete failed: ${(error as Error)?.message ?? 'unknown error'}`);
      return this.fallbackAutocomplete(trimmed);
    }
  }

  private normalizeGpsAddress(address: string): string {
    return address.trim().toUpperCase().replace(/\s+/g, '');
  }

  private isValidGpsFormat(address: string): boolean {
    return /^GA-\d{3}-\d{4}$/.test(address);
  }

  private async apiValidation(address: string): Promise<GhanaPostValidationResult> {
    const response = await fetch(`${this.getGhanaPostBaseUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ gps_address: address }),
    });

    if (!response.ok) {
      throw new Error(`GhanaPost API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      valid: data.valid === true,
      gpsAddress: address,
      region: data.region ?? null,
      city: data.city ?? null,
      street: data.street ?? null,
      confidence: data.confidence ?? (data.valid ? 95 : 0),
      message: data.message ?? undefined,
    };
  }

  private async apiAutocomplete(query: string): Promise<GhanaPostSuggestion[]> {
    const response = await fetch(`${this.getGhanaPostBaseUrl}/autocomplete?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GhanaPost API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.suggestions ?? []).map((s: Record<string, unknown>): GhanaPostSuggestion => ({
      gpsAddress: String(s.gps_address ?? s.address ?? ''),
      region: (s.region as string) ?? null,
      city: (s.city as string) ?? null,
      street: (s.street as string) ?? null,
      description: String(s.description ?? s.address ?? ''),
    }));
  }

  private fallbackValidation(address: string): GhanaPostValidationResult {
    const gaMatch = address.match(/^GA-(\d{3})-(\d{4})$/);
    if (!gaMatch) {
      return {
        valid: false,
        gpsAddress: address,
        region: null,
        city: null,
        street: null,
        confidence: 0,
        message: 'Invalid GhanaPost GPS format. Expected format: GA-XXX-XXXX (e.g. GA-184-9022)',
      };
    }

    const regionCode = parseInt(gaMatch[1], 10);
    const region = this.guessRegion(regionCode);

    return {
      valid: true,
      gpsAddress: address,
      region,
      city: null,
      street: null,
      confidence: 75,
      message: 'Address format is valid (online verification unavailable)',
    };
  }

  private fallbackAutocomplete(query: string): GhanaPostSuggestion[] {
    const gaMatch = query.match(/^GA-?(\d{0,3})/i);
    if (!gaMatch) {
      return [];
    }

    const regionCode = gaMatch[1] ? parseInt(gaMatch[1].padEnd(3, '0'), 10) : 0;
    const region = this.guessRegion(regionCode);

    return [
      {
        gpsAddress: query.toUpperCase(),
        region,
        city: null,
        street: null,
        description: `GhanaPost GPS: ${query.toUpperCase()}`,
      },
    ];
  }

  private guessRegion(code: number): string {
    const regions: Record<number, string> = {
      100: 'Greater Accra',
      101: 'Greater Accra',
      102: 'Greater Accra',
      103: 'Greater Accra',
      104: 'Greater Accra',
      105: 'Greater Accra',
      106: 'Greater Accra',
      107: 'Greater Accra',
      200: 'Ashanti',
      201: 'Ashanti',
      202: 'Ashanti',
      300: 'Eastern',
      301: 'Eastern',
      400: 'Central',
      401: 'Central',
      500: 'Western',
      501: 'Western',
      600: 'Volta',
      601: 'Volta',
      700: 'Oti',
      701: 'Oti',
      800: 'Northern',
      801: 'Northern',
      802: 'Northern',
      900: 'Upper East',
      901: 'Upper East',
      1000: 'Upper West',
      1001: 'Upper West',
    };
    return regions[code] ?? 'Unknown Region';
  }
}
