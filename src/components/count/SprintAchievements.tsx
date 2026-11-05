import { Check, Lock, Medal } from 'lucide-react'

import { formatNumber } from '@/lib/player'
import { SPRINT_ACHIEVEMENTS, getTitle } from '@/lib/season'
import { cn } from '@/lib/utils'

/** Titles earned by reaching a score in one 60-second sprint. */
export function SprintAchievements({
  best,
  titles,
  signedIn,
}: {
  best: number
  titles: string[]
  signedIn: boolean
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Medal className="size-5 text-primary" />
          Sprint achievements
        </h2>
        {signedIn && (
          <span className="text-sm text-muted-foreground">
            Your best{' '}
            <strong className="font-mono text-foreground tabular">
              {formatNumber(best)}
            </strong>
          </span>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SPRINT_ACHIEVEMENTS.map((a) => {
          const done = titles.includes(a.titleId) || best >= a.score
          return (
            <li
              key={a.titleId}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-4',
                done
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-background/40',
              )}
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-xl',
                  done
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="size-5" />
                ) : (
                  <Lock className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold tabular">
                  {formatNumber(a.score)}+ in one sprint
                </p>
                <p className="player-title text-sm">
                  Title: “{getTitle(a.titleId)?.text}”
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
