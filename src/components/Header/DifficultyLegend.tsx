import styles from './DifficultyLegend.module.css';

interface Props {
  onClose: () => void;
}

const FACTORS = [
  'Neighbourhood density',
  'Time of day',
  'Day of week',
  'Parking type',
  'Distance to city centre',
];

export function DifficultyLegend({ onClose }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Estimated Parking Difficulty</h3>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close legend">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <p className={styles.intro}>
        Difficulty scores are <strong>estimates</strong> based on heuristics — not real-time
        occupancy. Always displayed with an "est." label.
      </p>

      <div className={styles.levels}>
        <div className={styles.level}>
          <span className={`${styles.dot} ${styles.dotEasy}`} />
          <div>
            <div className={styles.levelName}>Easy to park</div>
            <div className={styles.levelDesc}>Score &lt; 40. Low demand expected.</div>
          </div>
        </div>
        <div className={styles.level}>
          <span className={`${styles.dot} ${styles.dotMedium}`} />
          <div>
            <div className={styles.levelName}>Moderate difficulty</div>
            <div className={styles.levelDesc}>Score 40–67. Some competition for spaces.</div>
          </div>
        </div>
        <div className={styles.level}>
          <span className={`${styles.dot} ${styles.dotHard}`} />
          <div>
            <div className={styles.levelName}>Hard to park</div>
            <div className={styles.levelDesc}>Score ≥ 68. High demand, allow extra time.</div>
          </div>
        </div>
      </div>

      <div className={styles.factors}>
        <div className={styles.factorsTitle}>Factors used</div>
        <ul className={styles.factorsList}>
          {FACTORS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      <p className={styles.disclaimer}>
        This is not live occupancy data. Accuracy may vary. Always verify on-site.
      </p>
    </div>
  );
}
