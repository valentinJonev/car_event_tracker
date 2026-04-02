import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
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
          className="w-full border border-white/10 bg-white/5 text-white rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder:text-zinc-500 pr-8 outline-none transition-colors"
        />
        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto backdrop-blur-xl">
          {isLoading && (
            <div className="px-4 py-2.5 text-sm text-zinc-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-transparent" />
              {t('organiserAutocomplete.searching')}
            </div>
          )}

          {!isLoading && options.length === 0 && (
            <div className="px-4 py-2.5 text-sm text-zinc-500">
              {inputValue.trim() ? t('organiserAutocomplete.noOrganisersFound') : t('organiserAutocomplete.typeToSearch')}
            </div>
          )}

          {!isLoading &&
            options.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelect(org)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 transition-colors ${
                  value?.id === org.id
                    ? 'bg-white/5 text-white font-medium'
                    : 'text-zinc-300'
                }`}
              >
                {/* Avatar or fallback */}
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
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
