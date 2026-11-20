import { useState } from 'react';
import clsx from 'clsx';
import type { ParkingCluster } from '@/types/parking';
import { PARKING_TYPE_LABELS, PARKING_TYPE_ICONS } from '@/types/parking';
import { useAppStore, selectSelectedSpotId } from '@/stores/appStore';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import styles from './ClusterCard.module.css';

interface Props {
  cluster: ParkingCluster;
}

function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

export function ClusterCard({ cluster }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selectedSpotId = useAppStore(selectSelectedSpotId);
  const setSelectedSpotId = useAppStore((s) => s.setSelectedSpotId);

  const isSelected = cluster.id === selectedSpotId;

  const handleCardClick = () => {
    setSelectedSpotId(isSelected ? null : cluster.id);
  };

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${cluster.lat},${cluster.lng}&travelmode=driving`;
  const walkingUrl = `https://www.google.com/maps/dir/?api=1&destination=${cluster.lat},${cluster.lng}&travelmode=walking`;

  const typeEntries = Object.entries(cluster.typeCounts) as Array<[string, number]>;

  return (
    <article
      className={clsx(styles.card, isSelected && styles.cardSelected)}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      {/* Header: spot count badge + address + difficulty */}
      <div className={styles.header}>
        <span className={styles.spotCount}>{cluster.spots.length}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className={styles.address}>{cluster.address}</h3>
        </div>
        <DifficultyBadge difficulty={cluster.avgDifficulty} showEstimated={true} />
      </div>

      {/* Badges */}
      <div className={styles.badges}>
        {cluster.hasFreeParking && (
          <span className={styles.freeBadge}>Free parking available</span>
        )}
      </div>

      {/* Key info */}
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          📍 {formatDistance(cluster.distanceMeters)} · 🚶 {cluster.walkingMinutes} min
        </span>
        {cluster.totalCapacity != null && (
          <span className={styles.metaItem}>
            🅿️ {cluster.totalCapacity.toLocaleString()} total spaces
          </span>
        )}
        <span className={styles.metaItem}>
          {cluster.spots.length} parking spot{cluster.spots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Type breakdown */}
      {typeEntries.length > 0 && (
        <div className={styles.typeBreakdown}>
          {typeEntries.map(([type, count]) => (
            <span key={type} className={styles.typeItem}>
              {PARKING_TYPE_ICONS[type as keyof typeof PARKING_TYPE_ICONS]} {count} {PARKING_TYPE_LABELS[type as keyof typeof PARKING_TYPE_LABELS]}
            </span>
          ))}
        </div>
      )}

      {/* Navigation links */}
      <div className={styles.actions}>
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.directionsLink}
          onClick={(e) => e.stopPropagation()}
        >
          🚗 Drive here
        </a>
        <a
          href={walkingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.directionsLink}
          onClick={(e) => e.stopPropagation()}
        >
          🚶 Walk here
        </a>
      </div>

      {/* Expand to see individual spots */}
      <button
        className={styles.expandBtn}
        onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide individual spots' : 'Show individual spots'}
      >
        {expanded ? `Hide ${cluster.spots.length} spots ▲` : `Show ${cluster.spots.length} spots ▼`}
      </button>

      {expanded && (
        <div className={styles.spotList}>
          {cluster.spots.map((spot) => (
            <div key={spot.id} className={styles.spotItem}>
              <span className={styles.spotName}>{spot.name}</span>
              <span className={styles.spotMeta}>
                {spot.distanceMeters != null && formatDistance(spot.distanceMeters)}
                {spot.capacity != null && ` · ${spot.capacity} spaces`}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
