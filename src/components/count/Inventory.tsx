import { useState } from 'react'
import { Backpack, Check } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Nametag, PlayerTitle } from '@/components/count/Nametag'
import { AnimatedNumber } from '@/components/count/AnimatedNumber'
import {
  equipFont,
  equipNametag,
  equipNumberAnim,
  equipTitle,
  type Me,
  type Profile,
} from '@/lib/game.functions'
import { NAMETAGS } from '@/lib/nametags'
import { BADGES, NAME_FONTS, NUMBER_ANIMS, TITLES } from '@/lib/season'
import { cn } from '@/lib/utils'

type Props = {
  player: Me | null
  profile: Profile | null
  onProfile: (profile: Profile) => void
  onNeedName: () => void
  onOpenShop: () => void
}

export function Inventory({
  player,
  profile,
  onProfile,
  onNeedName,
  onOpenShop,
}: Props) {
  const [busy, setBusy] = useState(false)
  const name = player?.name ?? 'Your name'
  const tags = NAMETAGS.filter((t) => profile?.owned.includes(t.id))
  const titles = TITLES.filter((t) => profile?.titles.includes(t.id))
  const fonts = NAME_FONTS.filter((f) => profile?.fonts.includes(f.id))
  const badges = BADGES.filter((b) => profile?.badges.includes(b.id))
  const font = profile?.equippedFont
  const anims = NUMBER_ANIMS.filter((a) => profile?.anims.includes(a.id))
  const anim = profile?.equippedAnim

  async function run(fn: () => Promise<{ ok: boolean; profile: Profile }>) {
    if (!player) return onNeedName()
    setBusy(true)
    try {
      const res = await fn()
      onProfile(res.profile)
      if (!res.ok) toast.error("You don't own that yet.")
    } catch {
      toast.error('Could not update your nameplate. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const setTag = (tagId: string | null) =>
    run(() => equipNametag({ data: { tagId } }))
  const setTitle = (titleId: string | null) =>
    run(() => equipTitle({ data: { titleId } }))
  const setFont = (fontId: string | null) =>
    run(() => equipFont({ data: { fontId } }))
  const setAnim = (animId: string | null) =>
    run(() => equipNumberAnim({ data: { animId } }))

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-card/70 p-5 sm:p-8">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Backpack className="size-6 text-primary" />
          Inventory
        </h2>
        <p className="mt-2 text-muted-foreground">
          Everything you've bought or earned. Equip a nametag, a title and a
          name font to show them on your nameplate. Badges are keepsakes of what
          you've achieved.
        </p>
      </div>

      <div className="grid place-items-center gap-1 rounded-2xl bg-background/60 px-4 py-6 text-lg">
        <span className="text-xs tracking-widest text-muted-foreground uppercase">
          Your nameplate
        </span>
        <Nametag name={name} tag={profile?.equipped} font={font} />
        <PlayerTitle title={profile?.equippedTitle} className="text-sm" />
      </div>

      {!player ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Sign in with Google to start collecting nametags, titles and badges.
          </p>
          <Button size="sm" onClick={onNeedName}>
            Sign in
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h3 className="mb-3 font-display text-lg font-bold">
              Nametags{' '}
              <span className="font-mono text-sm text-muted-foreground tabular">
                {tags.length}
              </span>
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              <Slot
                active={!profile?.equipped}
                busy={busy}
                onEquip={() => setTag(null)}
                label="Plain"
              >
                <Nametag
                  name={name}
                  tag={null}
                  font={font}
                  className="font-semibold"
                />
              </Slot>
              {tags.map((t) => (
                <Slot
                  key={t.id}
                  active={profile?.equipped === t.id}
                  busy={busy}
                  onEquip={() => setTag(t.id)}
                  label={t.label}
                >
                  <Nametag name={name} tag={t.id} font={font} />
                </Slot>
              ))}
            </ul>
            {tags.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No nametags yet.{' '}
                <button
                  type="button"
                  onClick={onOpenShop}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Visit the shop
                </button>{' '}
                or earn one from the season pass.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-display text-lg font-bold">
              Titles{' '}
              <span className="font-mono text-sm text-muted-foreground tabular">
                {titles.length}
              </span>
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              <Slot
                active={!profile?.equippedTitle}
                busy={busy}
                onEquip={() => setTitle(null)}
                label="No title"
              >
                <span className="text-sm text-muted-foreground">—</span>
              </Slot>
              {titles.map((t) => (
                <Slot
                  key={t.id}
                  active={profile?.equippedTitle === t.id}
                  busy={busy}
                  onEquip={() => setTitle(t.id)}
                  label="Title"
                >
                  <PlayerTitle
                    title={t.id}
                    className="text-center text-sm whitespace-normal"
                  />
                </Slot>
              ))}
            </ul>
            {titles.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Titles are earned from the season pass and 60s sprint
                achievements.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-display text-lg font-bold">
              Name fonts{' '}
              <span className="font-mono text-sm text-muted-foreground tabular">
                {fonts.length}
              </span>
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              <Slot
                active={!font}
                busy={busy}
                onEquip={() => setFont(null)}
                label="Default font"
              >
                <Nametag name={name} tag={null} className="font-semibold" />
              </Slot>
              {fonts.map((f) => (
                <Slot
                  key={f.id}
                  active={font === f.id}
                  busy={busy}
                  onEquip={() => setFont(f.id)}
                  label={f.label}
                >
                  <Nametag
                    name={name}
                    tag={null}
                    font={f.id}
                    className="text-lg"
                  />
                </Slot>
              ))}
            </ul>
            {fonts.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Name fonts are earned from the season pass.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-display text-lg font-bold">
              Number animations{' '}
              <span className="font-mono text-sm text-muted-foreground tabular">
                {anims.length}
              </span>
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Plays on the live count number you sent, until someone sends the
              next one.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              <Slot
                active={!anim}
                busy={busy}
                onEquip={() => setAnim(null)}
                label="No animation"
              >
                <span className="font-mono text-3xl font-extrabold tracking-tighter tabular">
                  1,234
                </span>
              </Slot>
              {anims.map((a) => (
                <Slot
                  key={a.id}
                  active={anim === a.id}
                  busy={busy}
                  onEquip={() => setAnim(a.id)}
                  label={a.label}
                >
                  <AnimatedNumber
                    anim={a.id}
                    className="font-mono text-3xl font-extrabold leading-none tracking-tighter tabular"
                  >
                    1,234
                  </AnimatedNumber>
                </Slot>
              ))}
            </ul>
            {anims.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Number animations are earned from the season pass.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-display text-lg font-bold">
              Badges{' '}
              <span className="font-mono text-sm text-muted-foreground tabular">
                {badges.length}
              </span>
            </h3>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No badges yet. Badges are earned from the season pass and stay
                here forever.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {badges.map((b) => (
                  <li
                    key={b.id}
                    className="overflow-hidden rounded-2xl border border-sky-300/40 bg-background/40"
                  >
                    <img
                      src={b.image}
                      alt={b.alt}
                      width={512}
                      height={512}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-4">
                      <p className="font-display text-lg font-bold">{b.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {b.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function Slot({
  active,
  busy,
  onEquip,
  label,
  children,
}: {
  active: boolean
  busy: boolean
  onEquip: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-4',
        active
          ? 'border-primary/60 bg-primary/10'
          : 'border-border bg-background/40',
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <div className="grid min-h-12 place-items-center overflow-hidden rounded-xl bg-background/70 px-3 py-2">
        {children}
      </div>
      {active ? (
        <Button size="sm" variant="secondary" disabled>
          <Check className="size-4" /> Equipped
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={onEquip}>
          Equip
        </Button>
      )}
    </li>
  )
}
