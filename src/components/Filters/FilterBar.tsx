import { useAppStore, selectFilters } from '@/stores/appStore';
import type { ParkingType, SortOption } from '@/types/parking';
import { PARKING_TYPE_ICONS, PARKING_TYPE_LABELS } from '@/types/parking';
import styles from './FilterBar.module.css';
import clsx from 'clsx';

const ALL_TYPES: ParkingType[] = ['garage', 'lot', 'park_and_ride', 'street_zone'];
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'easiest', label: 'Easiest' },
];
const RADIUS_OPTIONS = [300, 500, 1000, 1500, 2000];

export function FilterBar() {
  const filters = useAppStore(selectFilters);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);

  const toggleType = (type: ParkingType) => {
    const current = filters.types;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilters({ types: next });
  };

  const activeCount =
    (filters.types.length > 0 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.radiusMeters !== 1000 ? 1 : 0) +
    (filters.sortBy !== 'nearest' ? 1 : 0);

  return (
    <div className={styles.bar}>
      {/* Radius */}
      <div className={styles.group}>
        <label className={styles.groupLabel}>Radius</label>
        <div className={styles.chipRow}>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              className={clsx(styles.chip, filters.radiusMeters === r && styles.chipActive)}
              onClick={() => setFilters({ radiusMeters: r })}
            >
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div className={styles.group}>
        <label className={styles.groupLabel}>Type</label>
        <div className={styles.chipRow}>
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              className={clsx(
                styles.chip,
                styles.chipType,
                filters.types.includes(type) && styles.chipActive,
              )}
              onClick={() => toggleType(type)}
              title={PARKING_TYPE_LABELS[type]}
            >
              <span className={styles.typeLabel}>{PARKING_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Open now + sort */}
      <div className={styles.row}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.toggleInput}
            checked={filters.openNow}
            onChange={(e) => setFilters({ openNow: e.target.checked })}
          />
          <span className={clsx(styles.toggleTrack, filters.openNow && styles.toggleTrackOn)} />
          <span className={styles.toggleLabel}>Open now</span>
        </label>

        <div className={styles.sortGroup}>
          <label className={styles.sortLabel} htmlFor="sort-select">Sort</label>
          <select
            id="sort-select"
            className={styles.sortSelect}
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value as SortOption })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {activeCount > 0 && (
          <button className={styles.resetBtn} onClick={resetFilters}>
            Reset {activeCount > 0 && <span className={styles.resetBadge}>{activeCount}</span>}
          </button>
        )}
      </div>
    </div>
  );
}
