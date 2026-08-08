import { useEffect, useRef } from 'react'

interface Props {
  currentIndex: number
  maxIndex: number
  isPlaying: boolean
  speedMs: number
  label: string
  onIndexChange: (index: number) => void
  onTogglePlay: () => void
  onSpeedChange: (speedMs: number) => void
  onReset: () => void
}

const SPEED_OPTIONS = [
  { label: '4x', ms: 60 },
  { label: '2x', ms: 120 },
  { label: '1x', ms: 250 },
  { label: '0.5x', ms: 500 },
]

export function Scrubber({
  currentIndex,
  maxIndex,
  isPlaying,
  speedMs,
  label,
  onIndexChange,
  onTogglePlay,
  onSpeedChange,
  onReset,
}: Props) {
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = window.setInterval(() => {
      onIndexChange(Math.min(currentIndex + 1, maxIndex))
    }, speedMs)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speedMs, currentIndex, maxIndex])

  return (
    <div className="scrubber">
      <div className="scrubber-row">
        <button className="btn" onClick={onReset} title="Rewind to start">
          ⏮
        </button>
        <button
          className="btn"
          onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
          title="Step back"
        >
          ◀
        </button>
        <button className="btn btn-primary" onClick={onTogglePlay}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          className="btn"
          onClick={() => onIndexChange(Math.min(maxIndex, currentIndex + 1))}
          title="Step forward"
        >
          ▶
        </button>
        <button className="btn" onClick={() => onIndexChange(maxIndex)} title="Jump to latest">
          ⏭
        </button>
        <select value={speedMs} onChange={(e) => onSpeedChange(Number(e.target.value))}>
          {SPEED_OPTIONS.map((opt) => (
            <option key={opt.ms} value={opt.ms}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="scrubber-time">{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={maxIndex}
        value={currentIndex}
        onChange={(e) => onIndexChange(Number(e.target.value))}
        className="scrubber-slider"
      />
    </div>
  )
}
