import type { ParkingType } from '@/types/parking';
import { PARKING_TYPE_ICONS, PARKING_TYPE_LABELS } from '@/types/parking';
import styles from './TypeBadge.module.css';
import clsx from 'clsx';

interface Props {
  type: ParkingType;
}

const TYPE_CLASS: Record<ParkingType, string> = {
  garage: 'garage',
  lot: 'lot',
  park_and_ride: 'parkRide',
  street_zone: 'street',
  unknown: 'unknown',
};

export function TypeBadge({ type }: Props) {
  return (
    <span className={clsx(styles.badge, styles[TYPE_CLASS[type]])}>
      {PARKING_TYPE_LABELS[type]}
    </span>
  );
}
