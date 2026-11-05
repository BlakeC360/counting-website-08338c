import { useId } from 'react'

import { getNumberAnim } from '@/lib/season'
import { cn } from '@/lib/utils'

type Props = {
  /** Id of a number animation from src/lib/season.ts, or null for plain. */
  anim: string | null | undefined
  children: string
  className?: string
}

// Fixed (not random) so the server and browser render the same markup.
const TONGUES = Array.from({ length: 22 }, (_, i) => ({
  x: ((i * 37) % 100) + (i % 3) * 1.5,
  size: 0.22 + ((i * 13) % 7) * 0.035,
  dur: 0.9 + ((i * 7) % 5) * 0.14,
  delay: -((i * 0.173) % 1.3),
}))
const EMBERS = Array.from({ length: 10 }, (_, i) => ({
  x: (i * 41 + 7) % 100,
  dur: 1.8 + ((i * 3) % 4) * 0.35,
  delay: -((i * 0.47) % 2.4),
  drift: ((i % 5) - 2) * 0.06,
}))

/**
 * Animated noise that bends what it's applied to, like heat rising from a fire.
 * Sizes are relative to the element, so it looks the same at any font size.
 */
function FlameFilter({
  id,
  strength,
  freq,
  octaves,
}: {
  id: string
  strength: number
  freq: [number, number]
  octaves: number
}) {
  const [fx, fy] = freq
  return (
    <filter
      id={id}
      x="-20%"
      y="-40%"
      width="140%"
      height="160%"
      primitiveUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency={`${fx} ${fy}`}
        numOctaves={octaves}
        seed="7"
        result="noise"
      >
        <animate
          attributeName="baseFrequency"
          dur="3.5s"
          values={`${fx} ${fy};${fx * 1.25} ${fy * 1.4};${fx * 0.9} ${fy * 1.1};${fx} ${fy}`}
          repeatCount="indefinite"
        />
      </feTurbulence>
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={strength}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  )
}

/** A number shown with a player's equipped number animation. */
export function AnimatedNumber({ anim, children, className }: Props) {
  const def = getNumberAnim(anim)
  const filterId = `flame-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  if (!def) return <span className={className}>{children}</span>

  if (def.id === 'red-flame') {
    return (
      <span className={cn('num-anim', def.className, className)}>
        {/* Moving noise that makes the fire waver like real heat. */}
        <svg className="flame-defs" width="0" height="0" aria-hidden>
          <FlameFilter
            id={`${filterId}-fire`}
            strength={0.16}
            freq={[3, 6]}
            octaves={2}
          />
        </svg>

        <span
          className="flame-fire"
          style={{ filter: `url(#${filterId}-fire) blur(0.02em)` }}
          aria-hidden
        >
          <span className="flame-glow">{children}</span>
          <span className="flame-tongues">
            {TONGUES.map((t, i) => (
              <span
                key={i}
                className="tongue"
                style={
                  {
                    '--x': `${t.x}%`,
                    '--s': `${t.size}em`,
                    '--d': `${t.dur}s`,
                    '--delay': `${t.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        </span>

        <span className="flame-front">{children}</span>

        <span className="flame-embers" aria-hidden>
          {EMBERS.map((e, i) => (
            <span
              key={i}
              className="ember"
              style={
                {
                  '--x': `${e.x}%`,
                  '--d': `${e.dur}s`,
                  '--delay': `${e.delay}s`,
                  '--drift': `${e.drift}em`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      </span>
    )
  }

  return (
    <span className={cn('num-anim', def.className, className)}>
      <span className="pixel-text">{children}</span>
    </span>
  )
}
