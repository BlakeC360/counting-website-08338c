import { Award, Lock } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { formatNumber } from '@/lib/player'
import { cn } from '@/lib/utils'

type Props = {
  /** Player's all-time correct numbers; null while loading or without a player. */
  total: number | null
  hasPlayer: boolean
}

export function Achievements({ total, hasPlayer }: Props) {
  const count = total ?? 0
  const unlocked = ACHIEVEMENTS.filter((a) => count >= a.goal).length
  const next = ACHIEVEMENTS.find((a) => count < a.goal)
  const prevGoal = unlocked > 0 ? ACHIEVEMENTS[unlocked - 1]!.goal : 0
  const pct = next ? ((count - prevGoal) / (next.goal - prevGoal)) * 100 : 100

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Award className="size-5 text-primary" />
          Achievements
        </h2>
        <span className="font-mono text-sm text-muted-foreground tabular">
          {unlocked}/{ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="mb-5 rounded-2xl bg-background/50 p-4">
        {hasPlayer && total === null ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : !hasPlayer ? (
          <p className="text-sm text-muted-foreground">
            Pick a name and count in the live game to start unlocking
            achievements.
          </p>
        ) : next ? (
          <>
            <p className="mb-2 text-sm">
              <span className="font-mono font-bold tabular">
                {formatNumber(count)}
              </span>
              <span className="text-muted-foreground">
                {' '}
                / {formatNumber(next.goal)} to{' '}
              </span>
              <span className="font-semibold">{next.title}</span>
            </p>
            <Progress value={pct} aria-label={`Progress to ${next.title}`} />
          </>
        ) : (
          <p className="text-sm font-semibold text-primary">
            Every achievement unlocked. {formatNumber(count)} numbers and
            counting.
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {ACHIEVEMENTS.map((a) => {
          const done = count >= a.goal
          const Icon = done ? a.icon : Lock
          return (
            <li
              key={a.goal}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 transition-colors motion-reduce:transition-none',
                done
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-background/30',
              )}
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-lg',
                  done
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'font-semibold',
                      !done && 'text-muted-foreground',
                    )}
                  >
                    {a.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">
                    {formatNumber(a.goal)}
                  </span>
                </p>
                <p
                  className={cn(
                    'text-sm italic',
                    done ? 'text-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  “{a.line}”
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
