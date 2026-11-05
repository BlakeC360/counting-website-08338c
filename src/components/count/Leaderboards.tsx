import { Clock, Crown, Infinity as InfinityIcon, Zap } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { LeaderRow } from '@/lib/game.functions'
import { formatNumber } from '@/lib/player'
import { Nametag, PlayerTitle } from '@/components/count/Nametag'

type Boards = { allTime: LeaderRow[]; today: LeaderRow[]; sprint: LeaderRow[] }

type Props = {
  boards: Boards
  playerId: string | null
  tab: string
  onTabChange: (tab: string) => void
}

const META = {
  allTime: { label: 'All time', unit: 'numbers', icon: InfinityIcon },
  today: { label: '24 hours', unit: 'numbers', icon: Clock },
  sprint: { label: '60s sprint', unit: 'best', icon: Zap },
} as const

export function Leaderboards({ boards, playerId, tab, onTabChange }: Props) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
        <Crown className="size-5 text-primary" />
        Leaderboards
      </h2>
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          {(Object.keys(META) as (keyof Boards)[]).map((key) => {
            const Icon = META[key].icon
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="gap-1.5 text-xs sm:text-sm"
              >
                <Icon className="size-3.5" />
                {META[key].label}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {(Object.keys(META) as (keyof Boards)[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Board
              rows={boards[key]}
              unit={META[key].unit}
              playerId={playerId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}

function Board({
  rows,
  unit,
  playerId,
}: {
  rows: LeaderRow[]
  unit: string
  playerId: string | null
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No one on the board yet. Your name could be first.
      </p>
    )
  }
  const top = rows[0]?.value || 1
  return (
    <ol className="space-y-1.5">
      {rows.map((row, i) => {
        const me = row.id === playerId
        return (
          <li
            key={row.id}
            className={cn(
              'relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5',
              me ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-background/40',
            )}
          >
            <span
              className="absolute inset-y-0 left-0 bg-primary/10"
              style={{ width: `${(row.value / top) * 100}%` }}
              aria-hidden
            />
            <span
              className={cn(
                'relative w-6 text-center font-mono text-sm font-bold tabular',
                i === 0 ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {i + 1}
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5 font-medium">
                <Nametag name={row.name} tag={row.nametag} font={row.font} />
                {me && (
                  <span className="shrink-0 text-xs text-primary">(you)</span>
                )}
              </span>
              <PlayerTitle title={row.title} />
            </span>
            <span className="relative font-mono font-bold tabular">
              {formatNumber(row.value)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {unit}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
