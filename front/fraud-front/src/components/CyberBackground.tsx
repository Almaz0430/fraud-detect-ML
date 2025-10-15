export function CyberBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900" />

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(94, 234, 212, 0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="absolute inset-x-0 top-[-30%] h-[120%] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />

      <div className="absolute left-8 top-24 h-48 w-48 rounded-full border border-emerald-400/30 bg-emerald-500/5 blur-md" />
      <div className="absolute right-10 bottom-16 h-40 w-40 rounded-full border border-cyan-400/30 bg-cyan-500/5 blur-md" />

      <ShieldGlyph className="left-[12%] top-[20%]" />
      <ShieldGlyph className="right-[18%] top-[28%]" variant="emerald" delay="0.6s" />
      <ShieldGlyph className="left-[22%] bottom-[22%]" variant="cyan" delay="1.2s" />
    </div>
  )
}

function ShieldGlyph({
  className,
  variant = 'cyan',
  delay = '0s',
}: {
  className?: string
  variant?: 'cyan' | 'emerald'
  delay?: string
}) {
  const gradient =
    variant === 'emerald'
      ? 'from-emerald-300/70 via-emerald-400/60 to-teal-300/60'
      : 'from-cyan-300/70 via-sky-400/60 to-indigo-300/50'

  const glow =
    variant === 'emerald'
      ? 'shadow-[0_0_35px_rgba(16,185,129,0.45)]'
      : 'shadow-[0_0_35px_rgba(14,165,233,0.35)]'

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm ${glow} transition-all ${className ?? ''}`}
      style={{ animation: `pulseGlow 6s ease-in-out infinite`, animationDelay: delay }}
      data-variant={variant}
    >
      <div
        className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${gradient}`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-10 w-10 text-slate-950/90 drop-shadow-[0_4px_12px_rgba(15,23,42,0.25)]"
        >
          <path
            fill="currentColor"
            d="M12 2.25a1 1 0 0 0-.47.12l-6.5 3.25a1 1 0 0 0-.55.89v4.4c0 3.86 2.43 7.48 6.09 8.86l.1.03c.48.18.5.18.79.18s.31 0 .79-.18l.1-.03c3.66-1.38 6.09-5 6.09-8.86v-4.4a1 1 0 0 0-.55-.89l-6.5-3.25a1 1 0 0 0-.46-.12Zm0 2.2 5.5 2.75v3.46c0 3.14-1.95 6.14-4.95 7.28l-.05.02-.05-.02c-3-1.14-4.95-4.14-4.95-7.28V7.2L12 4.45Zm2.47 4.58-3.63 3.63-1.31-1.31a1 1 0 1 0-1.42 1.42l2 2a1 1 0 0 0 1.42 0l4.33-4.33a1 1 0 0 0-1.42-1.42Z"
          />
        </svg>
      </div>
    </div>
  )
}
