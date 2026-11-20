import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeocoding } from '@/hooks/useGeocoding';
import {
  useAppStore,
  selectRecentSearches,
  selectSelectedLocation,
} from '@/stores/appStore';
import type { GeocodingResult } from '@/types/geocoding';
import type { SearchLocation } from '@/types/parking';
import styles from './SearchBar.module.css';
import clsx from 'clsx';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedLocation = useAppStore(selectSelectedLocation);
  const recentSearches = useAppStore(selectRecentSearches);
  const setSelectedLocation = useAppStore((s) => s.setSelectedLocation);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const clearLocation = useAppStore((s) => s.clearLocation);

  const { suggestions, isSearching } = useGeocoding(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update input to reflect selected location
  useEffect(() => {
    if (selectedLocation && !isOpen) {
      setQuery(selectedLocation.address.split(',')[0]);
    }
  }, [selectedLocation, isOpen]);

  const handleSelect = useCallback(
    (result: GeocodingResult | SearchLocation) => {
      const location: SearchLocation = {
        lat: result.lat,
        lng: result.lng,
        address: 'displayName' in result ? result.displayName : result.address,
      };
      setSelectedLocation(location);
      addRecentSearch(location);
      setQuery(location.address.split(',')[0]);
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [setSelectedLocation, addRecentSearch],
  );

  const handleClear = () => {
    setQuery('');
    clearLocation();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = suggestions.length > 0 ? suggestions : showRecents ? recentSearches : [];
    if (!isOpen || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) handleSelect(item as GeocodingResult);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const showRecents = query.trim().length === 0 && recentSearches.length > 0;
  const listItems: Array<GeocodingResult | SearchLocation> =
    query.trim().length >= 3 ? suggestions : showRecents ? recentSearches : [];

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={clsx(styles.inputWrapper, isOpen && styles.inputWrapperOpen)}>
        <span className={styles.searchIcon} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Search address in Berlin…"
          value={query}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search address"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {isSearching && (
          <span className={styles.spinner} aria-label="Searching…">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
        )}

        {query.length > 0 && !isSearching && (
          <button
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Clear search"
            tabIndex={-1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && listItems.length > 0 && (
        <ul className={styles.dropdown} role="listbox" ref={listRef}>
          {showRecents && (
            <li className={styles.dropdownHeader}>Recent searches</li>
          )}
          {listItems.map((item, idx) => {
            const isResult = 'displayName' in item;
            const label = isResult ? item.displayName : item.address;
            const shortLabel = label.split(',')[0];
            const subLabel = label.split(',').slice(1, 3).join(',').trim();

            return (
              <li
                key={isResult ? item.id : item.address}
                role="option"
                aria-selected={activeIndex === idx}
                className={clsx(styles.dropdownItem, activeIndex === idx && styles.dropdownItemActive)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  {showRecents ? '🕐' : '📍'}
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemMain}>{shortLabel}</span>
                  {subLabel && <span className={styles.itemSub}>{subLabel}</span>}
                </span>
              </li>
            );
          })}
          <li className={styles.dropdownFooter}>
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">
              © OpenStreetMap contributors
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
