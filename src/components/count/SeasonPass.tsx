import { useState } from 'react'
import {
  Award,
  CaseSensitive,
  Check,
  Coins,
  Gift,
  Lock,
  Snowflake,
  Sparkles,
  Tag,
  Type,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Nametag } from '@/components/count/Nametag'
import { AnimatedNumber } from '@/components/count/AnimatedNumber'
import { claimSeasonReward, type Me, type Profile } from '@/lib/game.functions'
import { formatNumber } from '@/lib/player'
import {
  CURRENT_SEASON,
  getBadge,
  getNameFont,
  getNumberAnim,
  getTitle,
  type Reward,
} from '@/lib/season'
import { getNametag } from '@/lib/nametags'
import { cn } from '@/lib/utils'

type Props = {
  player: Me | null
  profile: Profile | null
  onProfile: (profile: Profile) => void
  onNeedName: () => void
}

function rewardLabel(r: Reward) {
  if (r.type === 'coins') return `${formatNumber(r.amount)} coins`
  if (r.type === 'title') return 'Title'
  if (r.type === 'badge') return 'Badge'
  if (r.type === 'font') return 'Name font'
  if (r.type === 'numberAnim')
    return `${getNumberAnim(r.animId)?.label ?? 'New'} number animation`
  return `${getNametag(r.tagId)?.label ?? 'New'} nametag`
}

function RewardPreview({ reward, name }: { reward: Reward; name: string }) {
  if (reward.type === 'coins') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-2xl font-extrabold tabular">
        <Coins className="size-6 text-primary" aria-hidden />+
        {formatNumber(reward.amount)}
      </span>
    )
  }
  if (reward.type === 'title') {
    return (
      <span className="player-title text-center text-base text-balance">
        “{getTitle(reward.titleId)?.text}”
      </span>
    )
  }
  if (reward.type === 'badge') {
    const b = getBadge(reward.badgeId)
    return (
      <span className="flex items-center gap-3 text-left">
        {b && (
          <img
            src={b.image}
            alt={b.alt}
            width={64}
            height={64}
            loading="lazy"
            className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-sky-300/40"
          />
        )}
        <span>
          <span className="block font-display font-bold">{b?.name}</span>
          <span className="block text-xs text-muted-foreground">
            {b?.description}
          </span>
        </span>
      </span>
    )
  }
  if (reward.type === 'font') {
    return (
      <span className="grid place-items-center gap-1">
        <Nametag
          name={name}
          tag={null}
          font={reward.fontId}
          className="text-xl"
        />
        <span className="text-xs text-muted-foreground">
          {getNameFont(reward.fontId)?.label} font
        </span>
      </span>
    )
  }
  if (reward.type === 'numberAnim') {
    return (
      <span className="grid place-items-center gap-1">
        <AnimatedNumber
          anim={reward.animId}
          className="font-mono text-4xl font-extrabold leading-none tracking-tighter tabular"
        >
          1,234
        </AnimatedNumber>
        <span className="text-xs text-muted-foreground">
          {getNumberAnim(reward.animId)?.label} number animation
        </span>
      </span>
    )
  }
  return <Nametag name={name} tag={reward.tagId} className="text-base" />
}

const ICONS = {
  coins: Coins,
  title: Type,
  nametag: Tag,
  badge: Award,
  font: CaseSensitive,
  numberAnim: Sparkles,
} as const

export function SeasonPass({ player, profile, onProfile, onNeedName }: Props) {
  const [busy, setBusy] = useState<number | null>(null)
  const season = CURRENT_SEASON
  const xp = player ? (profile?.seasonXp ?? 0) : 0
  const claimed = profile?.claimed ?? []
  const real = season.tiers.filter((t) => t.xp !== null)
  const nextTier = real.find((t) => xp < t.xp!)
  const prevXp = [...real].reverse().find((t) => xp >= t.xp!)?.xp ?? 0
  const pct = nextTier ? ((xp - prevXp) / (nextTier.xp! - prevXp)) * 100 : 100
  const previewName = player?.name ?? 'Your name'

  async function claim(tier: number) {
    if (!player) return onNeedName()
    setBusy(tier)
    try {
      const res = await claimSeasonReward({
        data: { tier },
      })
      onProfile(res.profile)
      if (res.ok) {
        const r = season.tiers[tier - 1]!.reward!
        toast.success(`Reward ${tier} claimed: ${rewardLabel(r)}`, {
          description:
            r.type === 'coins'
              ? undefined
              : 'Find it in your Inventory tab to equip it.',
        })
      } else toast.error(res.message)
    } catch {
      toast.error('Could not claim that reward. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-card/70 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Season pass
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-3xl font-extrabold">
            <Snowflake className="size-7 text-sky-300" aria-hidden />
            {season.name}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every correct number in the live count earns {season.xpPerNumber}{' '}
            XP, more with a streak boost. Reach each milestone to claim its
            reward.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-extrabold tabular">
            {formatNumber(xp)}
            <span className="ml-1 text-base text-muted-foreground">XP</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-background/50 p-4">
        {!player ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Sign in with Google and count to start earning XP.
            </p>
            <Button size="sm" onClick={onNeedName}>
              Sign in
            </Button>
          </div>
        ) : nextTier ? (
          <>
            <p className="mb-2 text-sm">
              <span className="font-mono font-bold tabular">
                {formatNumber(xp)}
              </span>
              <span className="text-muted-foreground">
                {' '}
                / {formatNumber(nextTier.xp!)} XP to the next reward · up to{' '}
                {Math.ceil((nextTier.xp! - xp) / season.xpPerNumber)} more
                numbers
              </span>
            </p>
            <Progress value={pct} aria-label="Progress to the next reward" />
          </>
        ) : (
          <p className="text-sm font-semibold text-primary">
            You reached every reward available this season. More are coming
            soon.
          </p>
        )}
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {season.tiers.map((t, i) => {
          const tier = i + 1
          if (t.xp === null) {
            return (
              <li
                key={tier}
                className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/20 p-4 text-center text-muted-foreground"
              >
                <span className="font-mono text-xs tabular">Reward {tier}</span>
                <Lock className="size-5" aria-hidden />
                <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  To be added soon
                </span>
              </li>
            )
          }
          const reached = xp >= t.xp
          const done = claimed.includes(tier)
          const Icon = ICONS[t.reward.type]
          return (
            <li
              key={tier}
              className={cn(
                'flex min-h-40 flex-col gap-3 rounded-2xl border p-4',
                done
                  ? 'border-primary/40 bg-primary/10'
                  : reached
                    ? 'border-sky-300/60 bg-sky-300/10'
                    : 'border-border bg-background/40',
              )}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {rewardLabel(t.reward)}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular">
                  {formatNumber(t.xp)} XP
                </span>
              </div>
              <div className="grid flex-1 place-items-center overflow-hidden rounded-xl bg-background/60 px-3 py-3">
                <RewardPreview reward={t.reward} name={previewName} />
              </div>
              {done ? (
                <Button size="sm" variant="secondary" disabled>
                  <Check className="size-4" /> Claimed
                </Button>
              ) : reached ? (
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => claim(tier)}
                >
                  <Gift className="size-4" /> Claim
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  <Lock className="size-4" />
                  {formatNumber(t.xp - xp)} XP to go
                </Button>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
