/** Tiny live waveform driven by mic RMS level (0..1). */
export function VoiceWave({ level, active }: { level: number; active: boolean }) {
  const bars = [0.55, 0.9, 0.7, 1, 0.6];
  return (
    <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
      {bars.map((f, i) => {
        const h = active ? Math.max(3, Math.min(14, 3 + level * 22 * f)) : 3;
        return (
          <span
            key={i}
            className="w-[2px] rounded-full bg-primary transition-[height] duration-100"
            style={{ height: `${h}px` }}
          />
        );
      })}
    </span>
  );
}
