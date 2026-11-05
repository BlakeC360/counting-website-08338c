import { useState } from 'react'
import { Check, Coins, Lock, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Nametag } from '@/components/count/Nametag'
import { buyNametag, equipNametag, type Profile } from '@/lib/game.functions'
import { SHOP_NAMETAGS } from '@/lib/nametags'
import { formatNumber } from '@/lib/player'
import type { Me } from '@/lib/game.functions'
import { cn } from '@/lib/utils'

type Props = {
  player: Me | null
  profile: Profile | null
  onProfile: (profile: Profile) => void
  onNeedName: () => void
}

export function CoinBalance({ coins }: { coins: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono font-bold tabular">
      <Coins className="size-4 text-primary" aria-hidden />
      {coins === null ? '–' : formatNumber(coins)}
      <span className="sr-only">coins</span>
    </span>
  )
}

export function Shop({ player, profile, onProfile, onNeedName }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const coins = profile?.coins ?? null
  const previewName = player?.name ?? 'Your name'

  async function buy(tagId: string, label: string) {
    if (!player) return onNeedName()
    setBusy(tagId)
    try {
      const res = await buyNametag({ data: { tagId } })
      onProfile(res.profile)
      if (res.ok) toast.success(`${label} nametag bought and equipped.`)
      else toast.error(res.message)
    } catch {
      toast.error('Could not complete that purchase. Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function equip(tagId: string | null) {
    if (!player) return onNeedName()
    setBusy(tagId ?? 'plain')
    try {
      const res = await equipNametag({ data: { tagId } })
      onProfile(res.profile)
      if (!res.ok) toast.error('You need to buy that nametag first.')
    } catch {
      toast.error('Could not change your nametag. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card/70 p-5 sm:p-8">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <ShoppingBag className="size-6 text-primary" />
          Nametag shop
        </h2>
        <p className="mt-2 text-muted-foreground">
          You earn 1 coin for every correct number in the live count, plus bonus
          coins from the season pass. Spend them on nametags that show
          everywhere your name appears.
        </p>
      </div>

      {!player && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Sign in with Google to start earning coins and buying nametags.
          </p>
          <Button size="sm" onClick={onNeedName}>
            Sign in
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">Your balance</span>
        <span className="text-lg">
          <CoinBalance coins={player ? coins : null} />
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Plain name</p>
          <p className="mt-1 font-semibold">
            <Nametag
              name={previewName}
              tag={null}
              font={profile?.equippedFont}
            />
          </p>
        </div>
        {profile?.equipped ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => equip(null)}
          >
            Use plain
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            <Check className="size-4" /> Equipped
          </span>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SHOP_NAMETAGS.map((t) => {
          const owned = profile?.owned.includes(t.id) ?? false
          const equipped = profile?.equipped === t.id
          const affordable = (coins ?? 0) >= t.price
          return (
            <li
              key={t.id}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border p-4',
                equipped
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-background/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{t.label}</span>
                {!owned && (
                  <span className="text-sm">
                    <CoinBalance coins={t.price} />
                  </span>
                )}
              </div>
              <div className="grid h-12 place-items-center overflow-hidden rounded-xl bg-background/70 px-3">
                <Nametag
                  name={previewName}
                  tag={t.id}
                  font={profile?.equippedFont}
                />
              </div>
              <p className="text-sm text-muted-foreground">{t.blurb}</p>
              {equipped ? (
                <Button size="sm" variant="secondary" disabled>
                  <Check className="size-4" /> Equipped
                </Button>
              ) : owned ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => equip(t.id)}
                >
                  Equip
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={busy !== null || !affordable}
                  onClick={() => buy(t.id, t.label)}
                >
                  {affordable ? (
                    <>Buy for {formatNumber(t.price)}</>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      {formatNumber(t.price)} coins
                    </>
                  )}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
