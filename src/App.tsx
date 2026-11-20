import { useAppStore, selectViewMode, selectParkingClusters, selectSelectedLocation } from '@/stores/appStore';
import { useParking } from '@/hooks/useParking';
import { Header } from '@/components/Header/Header';
import { FilterBar } from '@/components/Filters/FilterBar';
import { MapView } from '@/components/Map/MapView';
import { AddMarkDialog } from '@/components/Map/AddMarkDialog';
import { ResultsPanel } from '@/components/Results/ResultsPanel';
import styles from './App.module.css';
import clsx from 'clsx';

function App() {
  // Wire up the parking search side-effect
  useParking();

  const viewMode = useAppStore(selectViewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const clusters = useAppStore(selectParkingClusters);
  const location = useAppStore(selectSelectedLocation);

  const hasResults = clusters.length > 0;

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.body}>
        {/* Sidebar — filters + results list */}
        <aside className={clsx(styles.sidebar, viewMode === 'list' && styles.sidebarVisible)}>
          <FilterBar />
          <ResultsPanel />
        </aside>

        {/* Map panel */}
        <main className={clsx(styles.mapPanel, viewMode === 'map' && styles.mapPanelVisible)}>
          <MapView />

        {/* Floating results count — desktop: decorative badge; mobile: tap to show list */}
          {hasResults && location && (
            <button
              className={styles.mapResultsBadge}
              onClick={() => setViewMode('list')}
              aria-label={`Show ${clusters.length} nearby parking areas`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              {clusters.length} parking area{clusters.length !== 1 ? 's' : ''} nearby
            </button>
          )}
        </main>
      </div>
      <AddMarkDialog />
    </div>
  );
}

export default App;
