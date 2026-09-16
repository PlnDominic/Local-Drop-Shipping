'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Search, X } from 'lucide-react';
import { ghanaPostApi, type GhanaPostSuggestion, type GhanaPostValidationResult } from '../lib/api/ghana-post';

interface GhanaPostAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (result: GhanaPostValidationResult | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const GHANA_POST_REGEX = /^GA-\d{3}-\d{4}$/i;

export const GhanaPostAddressInput: React.FC<GhanaPostAddressInputProps> = ({
  value,
  onChange,
  onValidationChange,
  disabled = false,
  placeholder = 'Search GPS address (e.g. GA-184-9022)',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GhanaPostSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingValidation, setIsLoadingValidation] = useState(false);
  const [validationResult, setValidationResult] = useState<GhanaPostValidationResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = value || query;

  const runValidation = useCallback(async (gpsAddress: string) => {
    if (!gpsAddress || !GHANA_POST_REGEX.test(gpsAddress)) {
      const result: GhanaPostValidationResult = {
        success: false,
        data: {
          valid: false,
          gpsAddress,
          region: null,
          city: null,
          street: null,
          confidence: 0,
          message: GHANA_POST_REGEX.test(gpsAddress) ? '' : 'Enter a valid GhanaPost GPS address (e.g. GA-184-9022)',
        },
        error: 'Invalid format',
      };
      setValidationResult(result);
      onValidationChange?.(result);
      return;
    }

    setIsLoadingValidation(true);
    try {
      const result = await ghanaPostApi.validate(gpsAddress);
      setValidationResult(result);
      onValidationChange?.(result);
    } catch {
      const fallbackResult: GhanaPostValidationResult = {
        success: true,
        data: {
          valid: true,
          gpsAddress,
          region: null,
          city: null,
          street: null,
          confidence: 60,
          message: 'Unable to verify address online — format appears valid',
        },
      };
      setValidationResult(fallbackResult);
      onValidationChange?.(fallbackResult);
    } finally {
      setIsLoadingValidation(false);
    }
  }, [onValidationChange]);

  const loadSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const results = await ghanaPostApi.autocomplete(searchQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadSuggestions(query);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, loadSuggestions]);

  useEffect(() => {
    if (validateDebounceRef.current) clearTimeout(validateDebounceRef.current);
    validateDebounceRef.current = setTimeout(() => {
      if (touched && value) {
        runValidation(value);
      }
    }, 500);
    return () => { if (validateDebounceRef.current) clearTimeout(validateDebounceRef.current); };
  }, [value, touched, runValidation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: GhanaPostSuggestion) => {
    const selectedAddress = suggestion.gpsAddress;
    setQuery(selectedAddress);
    onChange(selectedAddress);
    setShowSuggestions(false);
    setTouched(true);
    runValidation(selectedAddress);
    inputRef.current?.blur();
  };

  const handleChange = (newValue: string) => {
    setQuery(newValue);
    onChange(newValue);
    setValidationResult(null);
    onValidationChange?.(null);
    setTouched(false);
  };

  const handleBlur = () => {
    if (value) {
      setTouched(true);
      runValidation(value);
    }
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const isValid = validationResult?.data.valid === true && validationResult.data.confidence >= 50;
  const isInvalid = touched && validationResult && !validationResult.data.valid;
  const showValidIcon = isValid && !isLoadingValidation;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-10 rounded-lg border border-gray-200 pl-3 pr-28 text-xs text-[#1c1c1c] outline-none focus:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="ghana-post-suggestions"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoadingValidation && (
            <Loader2 size={14} className="animate-spin text-blue-500" />
          )}
          {showValidIcon && (
            <CheckCircle2 size={16} className="text-emerald-500" />
          )}
          {isInvalid && (
            <X size={16} className="text-red-500" />
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id="ghana-post-suggestions"
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          <div className="px-3 py-2 text-[10px] font-black text-[#777] uppercase tracking-wider border-b border-gray-100">
            {isLoadingSuggestions ? 'Searching…' : `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`}
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.gpsAddress}-${index}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-3 py-2.5 flex items-start gap-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
            >
              <MapPin size={14} className="text-[#777] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#151515]">{suggestion.gpsAddress}</p>
                <p className="text-[10px] text-[#777]">
                  {suggestion.description}
                  {suggestion.region ? ` · ${suggestion.region}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {touched && !showSuggestions && !isLoadingSuggestions && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {isInvalid && (
            <span className="text-[10px] text-red-600 flex items-center gap-1">
              <X size={11} /> {validationResult?.data.message || 'Invalid GPS address'}
            </span>
          )}
          {showValidIcon && (
            <span className="text-[10px] text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={11} /> {validationResult?.data.message || 'Address verified'}
            </span>
          )}
          {!isValid && !isInvalid && value && GHANA_POST_REGEX.test(value) && (
            <span className="text-[10px] text-blue-600 flex items-center gap-1">
              <Search size={11} /> Verifying…
            </span>
          )}
        </div>
      )}
    </div>
  );
};
