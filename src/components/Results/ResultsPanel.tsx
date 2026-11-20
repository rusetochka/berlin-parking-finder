import { useAppStore, selectParkingResults, selectParkingClusters, selectIsLoading, selectError, selectSelectedLocation } from '@/stores/appStore';
import { ClusterCard } from './ClusterCard';
import styles from './ResultsPanel.module.css';

export function ResultsPanel() {
  const results = useAppStore(selectParkingResults);
  const clusters = useAppStore(selectParkingClusters);
  const isLoading = useAppStore(selectIsLoading);
  const error = useAppStore(selectError);
  const location = useAppStore(selectSelectedLocation);

  if (!location) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="14" fill="#dc2626" opacity="0.18"/>
              <rect x="1" y="1" width="46" height="46" rx="13" stroke="#dc2626" strokeWidth="1.5" fill="none"/>
              <text x="24" y="24" textAnchor="middle" dominantBaseline="central" fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize="28" fontWeight="700" fill="#dc2626">P</text>
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>Find parking in Berlin</h3>
          <p className={styles.emptyText}>
            Search an address or click on the map to see nearby parking options.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.skeletonTitle} />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3 className={styles.errorTitle}>Could not load parking data</h3>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3 className={styles.emptyTitle}>No parking found nearby</h3>
          <p className={styles.emptyText}>
            Try increasing the search radius or adjusting your filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.count}>
          {clusters.length} parking area{clusters.length !== 1 ? 's' : ''}
        </span>
        <span className={styles.locationLabel} title={location.address}>
          near {location.address.split(',')[0]}
        </span>
        <span className={styles.count} style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-normal)' }}>
          {results.length} total spot{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.list}>
        {clusters.map((cluster) => (
          <ClusterCard key={cluster.id} cluster={cluster} />
        ))}
      </div>
    </div>
  );
}
