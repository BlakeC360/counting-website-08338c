import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Flame,
  Hourglass,
  LogIn,
  RotateCcw,
  Trophy,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  COOLDOWN_MS,
  getLive,
  sendNumber,
  type GameState,
  type Me,
} from '@/lib/game.functions'
import { formatNumber, timeAgo } from '@/lib/player'
import { BOOST_EVERY } from '@/lib/season'
import { AnimatedNumber } from '@/components/count/AnimatedNumber'
import { Nametag, PlayerTitle } from '@/components/count/Nametag'
import type { Profile } from '@/lib/game.functions'

type Props = {
  initial: { state: GameState }
  player: Me | null
  onNeedSignIn: () => void
  onCounted: (profile: Profile, gained: { xp: number; coins: number }) => void
}

const POLL_MS = 1500

export function LiveCounter({
  initial,
  player,
  onNeedSignIn,
  onCounted,
}: Props) {
  const playerId = player?.publicId ?? null
  const [state, setState] = useState(initial.state)
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [anim, setAnim] = useState<'pop' | 'break' | null>(null)
  const [, setTick] = useState(0)
  // Local clock time when the cooldown ends (0 = none). Set from the server's
  // remaining time so it doesn't depend on the device clock matching.
  const [cooldownEnd, setCooldownEnd] = useState(0)
  const [now, setNow] = useState(0)
  const prev = useRef(initial.state)
  const inputRef = useRef<HTMLInputElement>(null)

  const apply = useCallback(
    (next: GameState) => {
      const before = prev.current
      if (next.current > before.current) setAnim('pop')
      else if (next.lastReset && next.lastReset.at !== before.lastReset?.at) {
        setAnim('break')
        if (next.lastReset.by !== player?.name && before.current > 0) {
          toast.error(
            `${next.lastReset.by} broke the count at ${formatNumber(next.lastReset.from)}`,
          )
        }
      }
      prev.current = next
      setState(next)
      setCooldownEnd(next.cooldownMs > 0 ? Date.now() + next.cooldownMs : 0)
      setNow(Date.now())
    },
    [player?.name],
  )

  const refresh = useCallback(async () => {
    try {
      const live = await getLive()
      apply(live.state)
    } catch {
      // transient network error — next poll will retry
    }
  }, [apply])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
      setTick((t) => t + 1)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (!anim) return
    const t = setTimeout(() => setAnim(null), 560)
    return () => clearTimeout(t)
  }, [anim, state.current])

  useEffect(() => {
    if (cooldownEnd <= Date.now()) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= cooldownEnd) clearInterval(id)
    }, 100)
    return () => clearInterval(id)
  }, [cooldownEnd])

  const cooldownLeft = Math.max(0, cooldownEnd - now)
  const coolingDown = cooldownLeft > 0

  const next = state.current + 1
  const youWentLast = !!playerId && state.lastPlayerId === playerId

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!player || player.banned) {
      onNeedSignIn()
      return
    }
    const n = Number(value)
    if (!value || !Number.isSafeInteger(n) || sending || coolingDown) return
    setSending(true)
    try {
      const res = await sendNumber({
        data: { number: n },
      })
      apply(res.state)
      if (res.ok) {
        setValue('')
        onCounted(res.profile, res.gained)
      } else if (res.reason === 'cooldown') {
        // Keep what they typed so they can resend once the cooldown ends.
        toast('Cooldown — the count just changed.', {
          description: 'Check the new number and try again in a moment.',
        })
      } else {
        setValue('')
        toast.error(
          res.reason === 'double'
            ? `You went twice in a row — the count was reset from ${formatNumber(res.brokeAt)} to 0.`
            : `Wrong number! It was ${formatNumber(res.expected)}. Back to 0.`,
        )
      }
      void refresh()
    } catch {
      toast.error('Could not send that number. Try again.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-6 shadow-2xl shadow-black/30 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          Live shared count
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="size-4 text-primary" />
          Record{' '}
          <strong className="font-mono text-foreground tabular">
            {formatNumber(state.record)}
          </strong>
        </span>
      </div>

      <div className="py-8 text-center sm:py-12">
        <div
          key={`${state.current}-${anim}`}
          className={cn(
            'font-mono font-extrabold leading-none tracking-tighter tabular',
            'text-[clamp(5rem,22vw,13rem)]',
            anim === 'pop' && 'animate-count-pop',
            anim === 'break' && 'animate-count-break',
          )}
          aria-live="polite"
        >
          <AnimatedNumber anim={state.lastPlayerAnim}>
            {formatNumber(state.current)}
          </AnimatedNumber>
        </div>
        <p className="mt-4 text-muted-foreground">
          {state.lastPlayerName ? (
            <>
              last counted by{' '}
              <Nametag
                name={state.lastPlayerName}
                tag={state.lastPlayerTag}
                font={state.lastPlayerFont}
                className="font-medium text-foreground"
              />
              <PlayerTitle title={state.lastPlayerTitle} className="mt-1" />
            </>
          ) : (
            'Fresh start — someone send 1'
          )}
        </p>
      </div>

      <BoostBar current={state.current} boost={state.boost} />

      <form onSubmit={submit} className="mx-auto flex max-w-md gap-2">
        <label htmlFor="count-input" className="sr-only">
          Next number
        </label>
        <Input
          ref={inputRef}
          id="count-input"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          placeholder={
            player ? `Type ${formatNumber(next)}…` : 'Sign in to count'
          }
          className="h-14 flex-1 bg-background/60 text-center font-mono text-2xl tabular md:text-2xl"
        />
        <Button
          type="submit"
          size="lg"
          disabled={sending || coolingDown || (!!player && !value)}
          className="h-14 min-w-28 px-6 text-base font-semibold"
        >
          {!player ? (
            <>
              <LogIn className="size-5" />
              Sign in
            </>
          ) : coolingDown ? (
            <>
              <Hourglass className="size-5" />
              <span className="font-mono tabular">
                {(cooldownLeft / 1000).toFixed(1)}s
              </span>
            </>
          ) : (
            <>
              <ArrowUp className="size-5" />
              Send
            </>
          )}
        </Button>
      </form>

      <div
        className="mx-auto mt-3 h-1 max-w-md overflow-hidden rounded-full bg-muted/40"
        role="progressbar"
        aria-label="Cooldown"
        aria-valuemin={0}
        aria-valuemax={COOLDOWN_MS}
        aria-valuenow={Math.round(cooldownLeft)}
      >
        <div
          className="h-full rounded-full bg-primary/70 transition-[width] duration-100 ease-linear motion-reduce:transition-none"
          style={{ width: `${(cooldownLeft / COOLDOWN_MS) * 100}%` }}
        />
      </div>

      <div className="mt-4 min-h-6 text-center text-sm">
        {coolingDown ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Hourglass className="size-4" />
            {COOLDOWN_MS / 1000}-second cooldown after every number, so
            simultaneous sends don't break the count.
          </span>
        ) : youWentLast ? (
          <span className="inline-flex items-center gap-1.5 text-destructive">
            <UserX className="size-4" />
            You counted last — wait for someone else or it resets.
          </span>
        ) : state.lastReset ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <RotateCcw className="size-4" />
            {state.lastReset.by}{' '}
            {state.lastReset.reason === 'double'
              ? 'went twice in a row'
              : 'sent the wrong number'}{' '}
            at {formatNumber(state.lastReset.from)} ·{' '}
            {timeAgo(state.lastReset.at)}
          </span>
        ) : null}
      </div>
    </section>
  )
}

function BoostBar({
  current,
  boost,
}: {
  current: number
  boost: GameState['boost']
}) {
  const into = current % BOOST_EVERY
  const left = BOOST_EVERY - into
  const fmt = (x: number) => `${Number(x.toFixed(2))}x`
  return (
    <div className="mx-auto mb-4 max-w-md rounded-2xl border border-sky-300/30 bg-sky-300/10 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-sky-200">
          <Flame className="size-4 text-primary" aria-hidden />
          {boost.level > 0 ? `Streak boost ×${boost.level}` : 'Streak boost'}
        </span>
        <span className="font-mono tabular">
          <span className="text-sky-200">{fmt(boost.xp)} XP</span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-primary">{fmt(boost.coins)} coins</span>
        </span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: BOOST_EVERY }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              i < into ? 'bg-sky-300' : 'bg-muted/50',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {left} more correct {left === 1 ? 'number' : 'numbers'} and everyone
        counting gets another +0.5x XP and +0.25x coins. A reset clears the
        boost.
      </p>
    </div>
  )
}
