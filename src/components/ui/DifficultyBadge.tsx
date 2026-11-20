import type { DifficultyResult } from '@/types/parking';
import styles from './DifficultyBadge.module.css';
import clsx from 'clsx';

interface Props {
  difficulty?: DifficultyResult;
  /** Show the "estimated" footnote next to the badge */
  showEstimated?: boolean;
}

export function DifficultyBadge({ difficulty, showEstimated = true }: Props) {
  if (!difficulty) {
    return (
      <span className={clsx(styles.badge, styles['badge--unknown'])}>
        <span className={clsx(styles.dot, styles['dot--unknown'])} />
        Unknown
      </span>
    );
  }

  const { level, label } = difficulty;

  return (
    <span className={clsx(styles.badge, styles[`badge--${level}`])}>
      <span className={clsx(styles.dot, styles[`dot--${level}`])} />
      {label}
      {showEstimated && (
        <span className={styles.estimated} title="This is an estimated score based on time, location, and parking type — not live occupancy data.">
          est.
        </span>
      )}
    </span>
  );
}
