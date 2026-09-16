import { api } from './client';

export interface GhanaPostValidationResult {
  success: boolean;
  data: {
    valid: boolean;
    gpsAddress: string;
    region: string | null;
    city: string | null;
    street: string | null;
    confidence: number;
    message?: string;
  };
  error?: string;
}

export interface GhanaPostSuggestion {
  gpsAddress: string;
  region: string | null;
  city: string | null;
  street: string | null;
  description: string;
}

export interface AutocompleteResponse {
  type: 'success';
  data: GhanaPostSuggestion[];
}

export const ghanaPostApi = {
  validate: (gpsAddress: string): Promise<GhanaPostValidationResult> =>
    api.post<GhanaPostValidationResult>('/ghana-post/validate', { gps_address: gpsAddress }),

  autocomplete: (query: string): Promise<GhanaPostSuggestion[]> =>
    api.get<AutocompleteResponse>(`/ghana-post/autocomplete?q=${encodeURIComponent(query)}`).then((res) => res.data ?? []),
};