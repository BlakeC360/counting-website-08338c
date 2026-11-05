import { CabinCampfireScene } from '@/components/count/NametagScenes'
import { getNametag } from '@/lib/nametags'
import { getNameFont, getTitle } from '@/lib/season'
import { cn } from '@/lib/utils'

type Props = {
  name: string
  tag: string | null | undefined
  font?: string | null
  className?: string
}

/** Reward nametags drawn with a small picture instead of an emoji. */
const SCENES: Record<string, () => React.ReactNode> = {
  'cabin-campfire': CabinCampfireScene,
}

const blockCopy = (e: React.SyntheticEvent) => e.preventDefault()

/** A player's name, wrapped in their equipped nametag and font. Names can't be selected or copied. */
export function Nametag({ name, tag, font, className }: Props) {
  const def = getNametag(tag)
  const fontClass = getNameFont(font)?.className
  const guard = {
    onCopy: blockCopy,
    onCut: blockCopy,
    onDragStart: blockCopy,
    onContextMenu: blockCopy,
  }
  const Scene = def ? SCENES[def.id] : undefined
  if (!def)
    return (
      <span className={cn('no-copy truncate', fontClass, className)} {...guard}>
        {name}
      </span>
    )
  return (
    <span
      className={cn('nametag no-copy', `nametag-${def.id}`, className)}
      {...guard}
    >
      {Scene && <Scene />}
      {def.emoji && (
        <span className="nametag-emoji" aria-hidden>
          {def.emoji}
        </span>
      )}
      <span className={cn('truncate', fontClass)}>{name}</span>
    </span>
  )
}

/** The equipped season title, shown next to or under a name. */
export function PlayerTitle({
  title,
  className,
}: {
  title: string | null | undefined
  className?: string
}) {
  const def = getTitle(title)
  if (!def) return null
  return (
    <span className={cn('player-title block truncate', className)}>
      “{def.text}”
    </span>
  )
}
