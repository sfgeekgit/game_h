import type { Direction } from '@game_h/shared';

interface DPadProps {
  onMove: (direction: Direction) => void;
  disabled?: boolean;
}

export function DPad({ onMove, disabled }: DPadProps) {
  const btn = (dir: Direction, label: string, style: React.CSSProperties) => (
    <button
      className="dpad-btn"
      style={style}
      onPointerDown={(e) => {
        e.preventDefault(); // prevent focus/scroll interference
        if (!disabled) onMove(dir);
      }}
      aria-label={dir}
      disabled={disabled}
    >
      {label}
    </button>
  );

  return (
    <div className="dpad">
      {btn('north', '▲', { gridColumn: 2, gridRow: 1 })}
      {btn('west', '◀', { gridColumn: 1, gridRow: 2 })}
      <div className="dpad-center" style={{ gridColumn: 2, gridRow: 2 }} />
      {btn('east', '▶', { gridColumn: 3, gridRow: 2 })}
      {btn('south', '▼', { gridColumn: 2, gridRow: 3 })}
    </div>
  );
}
