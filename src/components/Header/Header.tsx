import { useState } from 'react';
import { useAppStore, selectViewMode } from '@/stores/appStore';
import { SearchBar } from '@/components/SearchBar/SearchBar';
import { DifficultyLegend } from './DifficultyLegend';
import styles from './Header.module.css';
import clsx from 'clsx';

export function Header() {
  const viewMode = useAppStore(selectViewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandIcon} aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="8" fill="#dc2626"/>
            <text x="14" y="14" textAnchor="middle" dominantBaseline="central" fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize="17" fontWeight="700" fill="white">P</text>
          </svg>
        </span>
        <span className={styles.brandName}>Berlin Parking</span>
      </div>

      <div className={styles.searchWrapper}>
        <SearchBar />
      </div>

      <div className={styles.controls}>
        {/* View toggle — visible on all screens */}
        <div className={styles.viewToggle} role="group" aria-label="View mode">
          <button
            className={clsx(styles.viewBtn, viewMode === 'map' && styles.viewBtnActive)}
            onClick={() => setViewMode('map')}
            aria-pressed={viewMode === 'map'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            </svg>
            <span className={styles.viewLabel}>Map</span>
          </button>
          <button
            className={clsx(styles.viewBtn, viewMode === 'list' && styles.viewBtnActive)}
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span className={styles.viewLabel}>List</span>
          </button>
        </div>

        {/* Legend toggle */}
        <button
          className={clsx(styles.legendBtn, legendOpen && styles.legendBtnOpen)}
          onClick={() => setLegendOpen((v) => !v)}
          title="How is parking difficulty calculated?"
          aria-label="Difficulty colour guide"
          aria-expanded={legendOpen}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className={styles.legendLabel}>Legend</span>
        </button>
      </div>

      {legendOpen && (
        <div className={styles.legendOverlay}>
          <DifficultyLegend onClose={() => setLegendOpen(false)} />
        </div>
      )}
    </header>
  );
}
