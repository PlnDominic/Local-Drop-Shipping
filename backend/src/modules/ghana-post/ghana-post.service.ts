import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { XMLParser } from 'fast-xml-parser';
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
  private readonly apiAuthorization: string | undefined;
  private readonly asaaseUser: string | undefined;
  private readonly languageCode: string | undefined;
  private readonly deviceId: string | undefined;
  private readonly androidCert: string | undefined;
  private readonly androidPackage: string | undefined;
  private readonly countryName: string | undefined;
  private readonly country: string | undefined;
  private readonly apiUrl: string | undefined;
  private readonly xmlParser: XMLParser;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.apiAuthorization = this.config.get<string>('gpgpsAuthorization');
    this.asaaseUser = this.config.get<string>('gpgpsAsaaseUser');
    this.languageCode = this.config.get<string>('gpgpsLanguageCode') ?? 'en';
    this.deviceId = this.config.get<string>('gpgpsDeviceId');
    this.androidCert = this.config.get<string>('gpgpsAndroidCert');
    this.androidPackage = this.config.get<string>('gpgpsAndroidPackage');
    this.countryName = this.config.get<string>('gpgpsCountryName');
    this.country = this.config.get<string>('gpgpsCountry');
    this.apiUrl = this.config.get<string>('gpgpsApiURL');
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });
  }

  private getBaseApiUrl(): string {
    return this.apiUrl ?? 'https://api.ghanapostgps.com/v2/PublicGPGPSAPI.aspx';
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

    // If we don't have credentials, use fallback
    if (!this.apiAuthorization || !this.asaaseUser) {
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

    // If we don't have credentials, use fallback
    if (!this.apiAuthorization || !this.asaaseUser) {
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
    // Build request data for the GhanaPost API
    const requestData = new URLSearchParams();
    requestData.append('Action', 'ValidateGPS');
    requestData.append('GPSAddress', address);
    requestData.append('Authorization', this.apiAuthorization!);
    requestData.append('AsaaseUser', this.asaaseUser!);
    requestData.append('LanguageCode', this.languageCode!);
    requestData.append('DeviceID', this.deviceId!);
    requestData.append('AndroidCert', this.androidCert!);
    requestData.append('AndroidPackage', this.androidPackage!);
    requestData.append('CountryName', this.countryName!);
    requestData.append('Country', this.country!);

    const response = await fetch(this.getBaseApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestData.toString(),
    });

    if (!response.ok) {
      throw new Error(`GhanaPost API error: ${response.status}`);
    }

    const data = await response.text();

    // Parse the XML response (GhanaPost returns XML)
    const parsed = this.xmlParser.parse(data);

    // Extract values from parsed XML
    const valid = parsed?.Valid === 'True';
    const message = parsed?.Message;
    const region = parsed?.Region ?? null;
    const city = parsed?.City ?? null;
    const street = parsed?.Street ?? null;

    return {
      valid,
      gpsAddress: address,
      region,
      city,
      street,
      confidence: valid ? 95 : 0,
      message: message ?? undefined,
    };
  }

  private async apiAutocomplete(query: string): Promise<GhanaPostSuggestion[]> {
    // Build request data for autocomplete
    const requestData = new URLSearchParams();
    requestData.append('Action', 'SuggestGPS');
    requestData.append('SearchText', query);
    requestData.append('Authorization', this.apiAuthorization!);
    requestData.append('AsaaseUser', this.asaaseUser!);
    requestData.append('LanguageCode', this.languageCode!);
    requestData.append('DeviceID', this.deviceId!);
    requestData.append('AndroidCert', this.androidCert!);
    requestData.append('AndroidPackage', this.androidPackage!);
    requestData.append('CountryName', this.countryName!);
    requestData.append('Country', this.country!);

    const response = await fetch(this.getBaseApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestData.toString(),
    });

    if (!response.ok) {
      throw new Error(`GhanaPost API error: ${response.status}`);
    }

    const data = await response.text();

    // Parse XML response
    const parsed = this.xmlParser.parse(data);

    // Extract suggestions
    const suggestions: GhanaPostSuggestion[] = [];
    const suggestionElements = parsed?.Suggestion;

    if (Array.isArray(suggestionElements)) {
      for (const suggestion of suggestionElements) {
        const gpsAddress = suggestion.GPSAddress ?? '';
        const region = suggestion.Region ?? null;
        const city = suggestion.City ?? null;
        const street = suggestion.Street ?? null;
        const description = suggestion.Description ?? gpsAddress;

        suggestions.push({
          gpsAddress,
          region,
          city,
          street,
          description,
        });
      }
    } else if (suggestionElements) {
      // Single suggestion
      const suggestion = suggestionElements;
      suggestions.push({
        gpsAddress: suggestion.GPSAddress ?? '',
        region: suggestion.Region ?? null,
        city: suggestion.City ?? null,
        street: suggestion.Street ?? null,
        description: suggestion.Description ?? suggestion.GPSAddress ?? '',
      });
    }

    return suggestions;
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