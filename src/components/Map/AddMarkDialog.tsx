import { useState } from 'react';
import clsx from 'clsx';
import type { UserMarkDifficulty } from '@/types/parking';
import { USER_MARK_COLORS, USER_MARK_LABELS } from '@/types/parking';
import { useAppStore, selectAddMarkPending } from '@/stores/appStore';
import styles from './AddMarkDialog.module.css';

const DIFFICULTIES: UserMarkDifficulty[] = ['easy', 'moderate', 'hard'];

export function AddMarkDialog() {
  const pending = useAppStore(selectAddMarkPending);
  const setAddMarkPending = useAppStore((s) => s.setAddMarkPending);
  const addUserMark = useAppStore((s) => s.addUserMark);

  const [selected, setSelected] = useState<UserMarkDifficulty>('easy');
  const [note, setNote] = useState('');

  if (!pending) return null;

  const handleSave = () => {
    addUserMark({
      id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lat: pending.lat,
      lng: pending.lng,
      difficulty: selected,
      note: note.trim() || undefined,
      createdAt: Date.now(),
    });
    setNote('');
    setSelected('easy');
  };

  const handleCancel = () => {
    setAddMarkPending(null);
    setNote('');
    setSelected('easy');
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Mark parking spot</div>

        <div className={styles.options}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={clsx(styles.option, selected === d && styles.optionSelected)}
              onClick={() => setSelected(d)}
            >
              <div
                className={styles.dot}
                style={{ background: USER_MARK_COLORS[d] }}
              />
              <span className={styles.optionLabel}>{USER_MARK_LABELS[d]}</span>
            </button>
          ))}
        </div>

        <input
          className={styles.noteInput}
          type="text"
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            Save mark
          </button>
        </div>
      </div>
    </div>
  );
}
