import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { PARKING_TYPE_LABELS } from '@/types/parking';
import type { ParkingType } from '@/types/parking';

const TYPES: ParkingType[] = ['garage', 'lot', 'park_and_ride', 'street_zone', 'unknown'];

describe('TypeBadge', () => {
  it.each(TYPES)('renders the correct label for type "%s"', (type) => {
    render(<TypeBadge type={type} />);
    expect(screen.getByText(PARKING_TYPE_LABELS[type])).toBeInTheDocument();
  });
});
