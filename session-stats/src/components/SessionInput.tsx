import { useState } from 'react';

interface Props {
  onAdd: (raw: string) => void;
}

const PLACEHOLDER = `Paste Claude Code session summary here, e.g.:

  Total cost:            $2.43
  Total duration (API):  8m 18s
  Total duration (wall): 2d 10h 36m
  Total code changes:    1857 lines added, 461 lines removed
  Usage by model:
     claude-sonnet-4-5:  571 input, 35.9k output, 4.2m cache read, 170.0k cache write ($2.43)`;

export const SessionInput = ({ onAdd }: Props) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="session-input">
      <textarea
        rows={10}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER}
      />
      <button onClick={handleSubmit} disabled={!value.trim()}>
        Add Session
      </button>
    </div>
  );
};
