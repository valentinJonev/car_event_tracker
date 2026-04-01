import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganiserSearch, type OrganiserOption } from '../hooks/useOrganiserSearch';

interface OrganiserAutocompleteProps {
  value: OrganiserOption | null;
  onChange: (organiser: OrganiserOption | null) => void;
}

export default function OrganiserAutocomplete({
  value,
  onChange,
}: OrganiserAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value?.display_name ?? '');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce the search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, isLoading } = useOrganiserSearch(debounced);
  const options = data?.items ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync input display when external value changes
  useEffect(() => {
    setInputValue(value?.display_name ?? '');
  }, [value]);

  const handleSelect = useCallback(
    (org: OrganiserOption) => {
      onChange(org);
      setInputValue(org.display_name);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setInputValue('');
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          placeholder={t('organiserAutocomplete.searchPlaceholder')}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            // If user clears the input, also clear the selection
            if (!e.target.value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-8"
        />
        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-600 border-t-transparent" />
              {t('organiserAutocomplete.searching')}
            </div>
          )}

          {!isLoading && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {inputValue.trim() ? t('organiserAutocomplete.noOrganisersFound') : t('organiserAutocomplete.typeToSearch')}
            </div>
          )}

          {!isLoading &&
            options.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelect(org)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors ${
                  value?.id === org.id
                    ? 'bg-primary-50 dark:bg-gray-600 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {/* Avatar or fallback */}
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-xs font-semibold text-primary-700 dark:text-primary-300 flex-shrink-0">
                  {org.avatar_url ? (
                    <img
                      src={org.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    org.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="truncate">{org.display_name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
