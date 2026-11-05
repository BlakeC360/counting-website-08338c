import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Timer, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  finishSprint,
  startSprint,
  type Me,
  type Profile,
} from '@/lib/game.functions'
import { formatNumber } from '@/lib/player'
import { getTitle } from '@/lib/season'

type Props = {
  player: Me | null
  onNeedName: () => void
  onFinished: (profile?: Profile) => void
}

const DURATION_MS = 60_000

type Phase = 'idle' | 'starting' | 'running' | 'submitting' | 'done'

export function SprintMode({ player, onNeedName, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [sprintId, setSprintId] = useState<string | null>(null)
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(0)
  const [current, setCurrent] = useState(0)
  const [best, setBest] = useState(0)
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState(false)
  const [result, setResult] = useState<{
    score: number
    best: number
    accepted: boolean
    message?: string
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scoreRef = useRef(0)

  const remaining = Math.max(0, endsAt - now)

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setNow(Date.now()), 50)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'running' && remaining <= 0 && sprintId) {
      setPhase('submitting')
      void submitScore(sprintId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remaining, sprintId])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 400)
    return () => clearTimeout(t)
  }, [flash])

  async function begin() {
    if (!player || player.banned) {
      onNeedName()
      return
    }
    setPhase('starting')
    setResult(null)
    try {
      const res = await startSprint()
      setSprintId(res.sprintId)
      setCurrent(0)
      setBest(0)
      scoreRef.current = 0
      setValue('')
      const t = Date.now()
      setNow(t)
      setEndsAt(t + res.seconds * 1000)
      setPhase('running')
      setTimeout(() => inputRef.current?.focus(), 0)
    } catch {
      toast.error('Could not start a sprint. Try again.')
      setPhase('idle')
    }
  }

  async function submitScore(id: string) {
    if (!player) return
    const score = scoreRef.current
    try {
      // Server checks a full minute has passed; nudge past latency.
      await new Promise((r) => setTimeout(r, 400))
      const res = await finishSprint({
        data: { sprintId: id, score },
      })
      setResult(
        res.accepted
          ? { score: res.score, best: res.best, accepted: true }
          : { score, best: 0, accepted: false, message: res.message },
      )
      if (res.accepted) {
        for (const t of res.newTitles) {
          toast.success(`Sprint achievement: “${getTitle(t)?.text}”`, {
            description: 'New title unlocked. Equip it in your Inventory.',
          })
        }
        onFinished(res.profile)
      } else onFinished()
    } catch {
      setResult({
        score,
        best: 0,
        accepted: false,
        message: 'Could not save your score.',
      })
    } finally {
      setPhase('done')
    }
  }

  function miss() {
    setCurrent(0)
    setValue('')
    setFlash(true)
  }

  function onChange(raw: string) {
    const v = raw.replace(/\D/g, '')
    const target = String(current + 1)
    if (v === target) {
      const n = current + 1
      setCurrent(n)
      if (n > scoreRef.current) {
        scoreRef.current = n
        setBest(n)
      }
      setValue('')
      return
    }
    // Same rule as the live count: get it wrong and you're back to 0.
    if (v.length >= target.length || !target.startsWith(v)) {
      miss()
      return
    }
    setValue(v)
  }

  const seconds = Math.ceil(remaining / 1000)
  const progress = phase === 'running' ? remaining / DURATION_MS : 1

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-6 shadow-2xl shadow-black/30 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            60-second sprint · solo
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono tabular">
            <Timer className="size-4 text-primary" />
            {phase === 'running' ? `${seconds}s` : '60s'}
          </span>
        </div>

        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          <div
            className={cn(
              'h-full rounded-full bg-primary transition-[width] duration-75 ease-linear',
              seconds <= 10 && phase === 'running' && 'bg-destructive',
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {phase === 'running' || phase === 'submitting' ? (
          <>
            <div className="py-8 text-center sm:py-10">
              <div
                key={current}
                className={cn(
                  'font-mono font-extrabold leading-none tracking-tighter tabular',
                  'text-[clamp(5rem,22vw,12rem)]',
                  flash
                    ? 'animate-count-break'
                    : current > 0 && 'animate-count-pop',
                )}
              >
                {formatNumber(current)}
              </div>
              <p className="mt-4 text-muted-foreground">
                Best this run{' '}
                <strong className="font-mono text-foreground tabular">
                  {formatNumber(best)}
                </strong>{' '}
                · numbers submit automatically
              </p>
            </div>
            <div className="mx-auto max-w-md">
              <label htmlFor="sprint-input" className="sr-only">
                Next number
              </label>
              <Input
                ref={inputRef}
                id="sprint-input"
                inputMode="numeric"
                autoComplete="off"
                disabled={phase !== 'running'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && value) {
                    e.preventDefault()
                    miss()
                  }
                }}
                placeholder={`Type ${current + 1}`}
                className="h-14 bg-background/60 text-center font-mono text-2xl tabular md:text-2xl"
              />
            </div>
          </>
        ) : (
          <div className="py-10 text-center sm:py-14">
            {result ? (
              <>
                <p className="text-sm tracking-widest text-muted-foreground uppercase">
                  {result.accepted ? 'Time! You reached' : 'Run not counted'}
                </p>
                <div className="font-mono text-[clamp(5rem,20vw,11rem)] font-extrabold leading-none tracking-tighter tabular">
                  {formatNumber(result.score)}
                </div>
                <p className="mt-4 text-muted-foreground">
                  {result.accepted
                    ? result.score >= result.best
                      ? 'New personal best!'
                      : `Your best is ${formatNumber(result.best)}.`
                    : result.message}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">
                  How high can you count in a minute?
                </h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                  Type 1, 2, 3… as fast as you can. Each correct number submits
                  itself. One slip and you drop back to 0 — your highest number
                  goes on the board.
                </p>
              </>
            )}
            <Button
              size="lg"
              onClick={begin}
              disabled={phase === 'starting'}
              className="mt-8 h-14 px-8 text-base font-semibold"
            >
              {result ? (
                <RotateCcw className="size-5" />
              ) : (
                <Play className="size-5" />
              )}
              {phase === 'starting'
                ? 'Get ready…'
                : result
                  ? 'Sprint again'
                  : 'Start the clock'}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
