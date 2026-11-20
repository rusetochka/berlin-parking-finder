import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import type { DifficultyResult } from '@/types/parking';

function makeResult(level: DifficultyResult['level'], score: number): DifficultyResult {
  const labels = { easy: 'Easy to park', medium: 'Moderate difficulty', hard: 'Hard to park' };
  return { level, score, label: labels[level], isEstimated: true, factors: [] };
}

describe('DifficultyBadge', () => {
  it('renders "Unknown" when no difficulty supplied', () => {
    render(<DifficultyBadge />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders the difficulty label', () => {
    render(<DifficultyBadge difficulty={makeResult('easy', 25)} />);
    expect(screen.getByText('Easy to park')).toBeInTheDocument();
  });

  it('renders "est." when showEstimated=true (default)', () => {
    render(<DifficultyBadge difficulty={makeResult('medium', 55)} />);
    expect(screen.getByText('est.')).toBeInTheDocument();
  });

  it('hides "est." when showEstimated=false', () => {
    render(<DifficultyBadge difficulty={makeResult('hard', 80)} showEstimated={false} />);
    expect(screen.queryByText('est.')).not.toBeInTheDocument();
  });

  it('renders correct label for each level', () => {
    const { rerender } = render(<DifficultyBadge difficulty={makeResult('easy', 20)} />);
    expect(screen.getByText('Easy to park')).toBeInTheDocument();

    rerender(<DifficultyBadge difficulty={makeResult('medium', 55)} />);
    expect(screen.getByText('Moderate difficulty')).toBeInTheDocument();

    rerender(<DifficultyBadge difficulty={makeResult('hard', 80)} />);
    expect(screen.getByText('Hard to park')).toBeInTheDocument();
  });
});
