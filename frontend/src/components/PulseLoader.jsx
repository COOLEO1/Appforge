// The signature element: a breathing waveform, like a track loading in a
// DAW, shown while AppForge is thinking/generating. Bars pulse with staggered
// delays so it reads as one continuous motion, not discrete blinking.
export default function PulseLoader({ label = "Building" }) {
  const bars = [0, 1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="flex items-end gap-[3px] h-4">
        {bars.map((i) => (
          <span
            key={i}
            className="w-[3px] bg-blood rounded-full animate-breathe"
            style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <span className="text-smoke text-sm font-mono tracking-wide">{label}…</span>
    </div>
  );
}
