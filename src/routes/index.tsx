import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Ban,
  Flame,
  LogIn,
  LogOut,
  Repeat,
  ScrollText,
  Shield,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LiveCounter } from '@/components/count/LiveCounter'
import { SprintMode } from '@/components/count/SprintMode'
import { Leaderboards } from '@/components/count/Leaderboards'
import { NameForm } from '@/components/count/NameForm'
import { Achievements } from '@/components/count/Achievements'
import { SprintAchievements } from '@/components/count/SprintAchievements'
import { CoinBalance, Shop } from '@/components/count/Shop'
import { Button } from '@/components/ui/button'
import { getLeaderboards, getLive, type Profile } from '@/lib/game.functions'
import { useAuth } from '@/components/AuthProvider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { newlyUnlocked } from '@/lib/achievements'
import { CURRENT_SEASON } from '@/lib/season'
import { SeasonPass } from '@/components/count/SeasonPass'
import { Inventory } from '@/components/count/Inventory'
import { formatNumber } from '@/lib/player'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [live, boards] = await Promise.all([getLive(), getLeaderboards()])
    return { live, boards }
  },
  component: Home,
})

type Mode =
  | 'count'
  | 'sprint'
  | 'season'
  | 'shop'
  | 'inventory'
  | 'achievements'
  | 'rules'

const MODES: { value: Mode; label: string }[] = [
  { value: 'count', label: 'Live count' },
  { value: 'sprint', label: '60s sprint' },
  { value: 'season', label: '❄️ Season' },
  { value: 'shop', label: 'Shop' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'rules', label: 'Rules' },
]

const RULES = [
  {
    icon: Users,
    title: 'Count together',
    text: 'Everyone shares one number. Send the next one.',
  },
  {
    icon: Repeat,
    title: 'Never twice in a row',
    text: 'Someone else has to go before you can count again.',
  },
  {
    icon: Ban,
    title: 'Wrong or repeat = 0',
    text: 'Send a repeated or wrong number and the count resets.',
  },
  {
    icon: Flame,
    title: 'Streak boosts',
    text: 'Every 10 correct numbers in a row adds +0.5x XP and +0.25x coins for everyone counting.',
  },
  {
    icon: LogIn,
    title: 'Sign in with Google',
    text: 'Everyone counts with a Google account. Cheaters and trolls can be banned.',
  },
  {
    icon: Zap,
    title: 'Sprint solo',
    text: 'See how high you can get by yourself in 60 seconds.',
  },
]

function Home() {
  const { live, boards: initialBoards } = Route.useLoaderData()
  const auth = useAuth()
  const { me, profile, ready } = auth
  const [mode, setMode] = useState<Mode>('count')
  const [boards, setBoards] = useState(initialBoards)
  const [boardTab, setBoardTab] = useState('allTime')
  const totalRef = useRef<number | null>(null)
  const xpRef = useRef<number | null>(null)
  const player = me && !me.banned ? me : null

  useEffect(() => {
    if (!profile) return
    totalRef.current ??= profile.total
    xpRef.current ??= profile.seasonXp
  }, [profile])

  const refreshBoards = useCallback(async () => {
    try {
      setBoards(await getLeaderboards())
    } catch {
      // keep showing the last good boards
    }
  }, [])

  const { setProfile } = auth
  const onProfile = useCallback(
    (next: Profile) => {
      totalRef.current = next.total
      xpRef.current = next.seasonXp
      setProfile(next)
      void refreshBoards()
    },
    [refreshBoards, setProfile],
  )

  const onCounted = useCallback(
    (next: Profile, gained: { xp: number; coins: number }) => {
      const before = totalRef.current ?? next.total - 1
      const xpBefore = xpRef.current ?? next.seasonXp - gained.xp
      for (const t of CURRENT_SEASON.tiers) {
        if (t.xp !== null && t.xp > xpBefore && t.xp <= next.seasonXp) {
          toast.success('Season reward ready!', {
            description: `You reached ${formatNumber(t.xp)} XP. Claim it in the Season tab.`,
          })
        }
      }
      for (const a of newlyUnlocked(before, next.total)) {
        toast.success(`Achievement unlocked: ${a.title}`, {
          description: `${formatNumber(a.goal)} numbers counted. “${a.line}”`,
        })
      }
      totalRef.current = next.total
      xpRef.current = next.seasonXp
      setProfile(next)
      void refreshBoards()
    },
    [refreshBoards, setProfile],
  )

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshBoards()
    }, 10_000)
    return () => clearInterval(t)
  }, [refreshBoards])

  const needSignIn = () => {
    if (me?.banned) {
      toast.error('Your account is banned from counting.')
      return
    }
    auth.signIn()
  }

  return (
    <div className="grain min-h-screen">
      <header className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-5 py-6">
        <a href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary font-mono text-lg font-extrabold text-primary-foreground">
            ∞
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Infinite Count
          </span>
        </a>
        <div className="flex flex-wrap items-center gap-3">
          {!ready ? (
            <span className="h-9 w-40 animate-pulse rounded-full bg-muted/60 motion-reduce:animate-none" />
          ) : me ? (
            <>
              <NameForm
                me={me}
                tag={profile?.equipped}
                title={profile?.equippedTitle}
                font={profile?.equippedFont}
                onSaved={(next) => {
                  auth.setMe(next)
                  void refreshBoards()
                }}
              />
              <Button
                variant="outline"
                className="rounded-full bg-card/60"
                onClick={() => setMode('shop')}
                aria-label="Coin balance, open the shop"
              >
                <CoinBalance coins={profile?.coins ?? null} />
              </Button>
              {me.isAdmin && (
                <Button asChild variant="secondary" className="rounded-full">
                  <Link to="/admin">
                    <Shield className="size-4" /> Admin
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Sign out"
                onClick={() => void auth.signOut()}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button className="rounded-full" onClick={auth.signIn}>
              <GoogleMark /> Sign in with Google
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-content px-5 pb-16">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            Count to infinity. <span className="text-primary">Together.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            One number shared by everyone on the internet. Add the next one —
            but repeat a number or go twice in a row, and it all goes back to
            zero.
          </p>
        </div>

        {me?.banned && (
          <Alert variant="destructive" className="mb-6">
            <Ban className="size-4" />
            <AlertTitle>Your account is banned</AlertTitle>
            <AlertDescription>
              You can still watch, but you can't count, sprint, claim rewards or
              buy anything.
              {me.banReason ? ` Reason: ${me.banReason}` : ''}
            </AlertDescription>
          </Alert>
        )}
        {ready && !me && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-300/30 bg-card/70 px-5 py-4">
            <p className="text-sm text-muted-foreground">
              {auth.wrongProvider
                ? 'Only Google accounts can count. Sign out and sign in with Google.'
                : 'Sign in with Google to count, sprint, earn coins and climb the season pass.'}
            </p>
            {auth.wrongProvider ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void auth.signOut()}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            ) : (
              <Button size="sm" onClick={auth.signIn}>
                <GoogleMark /> Sign in with Google
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <TabsList className="h-auto max-w-full flex-wrap justify-start">
                {MODES.map((m) => (
                  <TabsTrigger key={m.value} value={m.value} className="px-4">
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div hidden={mode !== 'count'}>
              <LiveCounter
                initial={live}
                player={player}
                onNeedSignIn={needSignIn}
                onCounted={onCounted}
              />
            </div>
            <div hidden={mode !== 'sprint'}>
              <SprintMode
                player={player}
                onNeedName={needSignIn}
                onFinished={(next) => {
                  if (next) setProfile(next)
                  setBoardTab('sprint')
                  void refreshBoards()
                }}
              />
            </div>
            <div hidden={mode !== 'season'}>
              <SeasonPass
                player={player}
                profile={me ? profile : null}
                onProfile={onProfile}
                onNeedName={needSignIn}
              />
            </div>
            <div hidden={mode !== 'inventory'}>
              <Inventory
                player={me}
                profile={me ? profile : null}
                onProfile={onProfile}
                onNeedName={needSignIn}
                onOpenShop={() => setMode('shop')}
              />
            </div>
            <div hidden={mode !== 'shop'}>
              <Shop
                player={player}
                profile={me ? profile : null}
                onProfile={onProfile}
                onNeedName={needSignIn}
              />
            </div>
            <div hidden={mode !== 'achievements'} className="space-y-4">
              <Achievements
                total={me ? (profile?.total ?? null) : null}
                hasPlayer={!!me}
              />
              <SprintAchievements
                best={me ? (profile?.bestSprint ?? 0) : 0}
                titles={me ? (profile?.titles ?? []) : []}
                signedIn={!!me}
              />
            </div>
            <div hidden={mode !== 'rules'}>
              <section className="rounded-3xl border border-border bg-card/70 p-5 sm:p-8">
                <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
                  <ScrollText className="size-6 text-primary" />
                  The rules
                </h2>
                <ul className="grid gap-5 sm:grid-cols-2">
                  {RULES.map(({ icon: Icon, title, text }) => (
                    <li key={title} className="flex gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <aside className="space-y-6">
            <Leaderboards
              boards={boards}
              playerId={me?.publicId ?? null}
              tab={boardTab}
              onTabChange={setBoardTab}
            />
          </aside>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-sm text-muted-foreground">
        Infinite Count · there is no last number
      </footer>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12Z"
      />
    </svg>
  )
}
