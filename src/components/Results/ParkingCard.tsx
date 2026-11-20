import { useState } from 'react';
import clsx from 'clsx';
import type { ParkingSpot } from '@/types/parking';
import { useAppStore, selectSelectedSpotId } from '@/stores/appStore';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { TypeBadge } from '@/components/ui/TypeBadge';
import styles from './ParkingCard.module.css';

interface Props {
  spot: ParkingSpot;
}

function formatOpeningHours(hours: ParkingSpot['openingHours']): string {
  if (hours === '24/7') return '24 / 7';
  if (hours === 'unknown') return 'Hours unknown';
  return hours.description;
}

function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

export function ParkingCard({ spot }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selectedSpotId = useAppStore(selectSelectedSpotId);
  const setSelectedSpotId = useAppStore((s) => s.setSelectedSpotId);

  const isSelected = spot.id === selectedSpotId;

  const handleCardClick = () => {
    setSelectedSpotId(isSelected ? null : spot.id);
  };

  const walkingUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`;

  return (
    <article
      className={clsx(styles.card, isSelected && styles.cardSelected)}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      {/* Top row */}
      <div className={styles.top}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{spot.name}</h3>
          <DifficultyBadge difficulty={spot.difficulty} showEstimated={true} />
        </div>
        <div className={styles.badges}>
          <TypeBadge type={spot.type} />
          {spot.isFree === true && (
            <span className={styles.freeBadge}>Free</span>
          )}
        </div>
      </div>

      {/* Key info row */}
      <div className={styles.meta}>
        {spot.distanceMeters !== undefined && (
          <span className={styles.metaItem}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDistance(spot.distanceMeters)}
            {' · '}
            🚶 {spot.walkingMinutes} min
          </span>
        )}
        {spot.feeDescription && (
          <span className={styles.metaItem}>
            💶 {spot.feeDescription}
          </span>
        )}
      </div>

      {/* Expand / collapse details */}
      <button
        className={styles.expandBtn}
        onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Show less' : 'Show more details'}
      >
        {expanded ? 'Less detail ▲' : 'More detail ▼'}
      </button>

      {expanded && (
        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Address</span>
            <span className={styles.detailValue}>{spot.address}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Hours</span>
            <span className={styles.detailValue}>{formatOpeningHours(spot.openingHours)}</span>
          </div>
          {spot.capacity && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Capacity</span>
              <span className={styles.detailValue}>{spot.capacity.toLocaleString()} spaces</span>
            </div>
          )}
          {spot.difficulty && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Est. difficulty</span>
              <span className={styles.detailValue}>
                Score {spot.difficulty.score}/100 · factors: {spot.difficulty.factors.join(', ')}
              </span>
            </div>
          )}
          <div className={styles.actions}>
            <a
              href={walkingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.directionsLink}
              onClick={(e) => e.stopPropagation()}
            >
              🗺️ Walking directions
            </a>
            {spot.infoUrl && (
              <a
                href={spot.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.infoLink}
                onClick={(e) => e.stopPropagation()}
              >
                More info ↗
              </a>
            )}
          </div>
          <p className={styles.disclaimer}>
            ⚠️ Estimated parking difficulty — not live occupancy data.
          </p>
        </div>
      )}
    </article>
  );
}
