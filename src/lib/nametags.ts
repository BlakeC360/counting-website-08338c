export type NametagKind = 'color' | 'season' | 'reward'

export type Nametag = {
  id: string
  label: string
  kind: NametagKind
  price: number
  /** Optional emoji shown before the name. */
  emoji?: string
  blurb: string
}

/** Shop catalog. Ids are stored in the database, so never rename one. */
export const NAMETAGS: Nametag[] = [
  {
    id: 'bronze',
    label: 'Bronze',
    kind: 'color',
    price: 250,
    blurb: 'Everyone starts somewhere.',
  },
  {
    id: 'silver',
    label: 'Silver',
    kind: 'color',
    price: 500,
    blurb: 'Polished and respectable.',
  },
  {
    id: 'gold',
    label: 'Gold',
    kind: 'color',
    price: 550,
    blurb: 'Shine on every leaderboard.',
  },
  {
    id: 'ruby',
    label: 'Ruby',
    kind: 'color',
    price: 1000,
    blurb: 'Deep red, hard to miss.',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    kind: 'color',
    price: 1000,
    blurb: 'Rich green glow.',
  },
  {
    id: 'sapphire',
    label: 'Sapphire',
    kind: 'color',
    price: 1500,
    blurb: 'Cool, calm, counting.',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    kind: 'color',
    price: 3000,
    blurb: 'Dark glass with a violet edge.',
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    kind: 'color',
    price: 5000,
    blurb: 'Every color, slowly shifting.',
  },
  {
    id: 'diamond',
    label: 'Diamond',
    kind: 'color',
    price: 5000,
    emoji: '💎',
    blurb: 'For the truly dedicated.',
  },
  {
    id: 'spring',
    label: 'Spring',
    kind: 'season',
    price: 60,
    emoji: '🌸',
    blurb: 'Blossoms and fresh starts.',
  },
  {
    id: 'summer',
    label: 'Summer',
    kind: 'season',
    price: 60,
    emoji: '☀️',
    blurb: 'Sunshine and long days.',
  },
  {
    id: 'autumn',
    label: 'Autumn',
    kind: 'season',
    price: 60,
    emoji: '🍂',
    blurb: 'Crisp leaves, warm tones.',
  },
  {
    id: 'winter',
    label: 'Winter',
    kind: 'season',
    price: 60,
    emoji: '❄️',
    blurb: 'Frosty and bright.',
  },
  {
    id: 'spooky',
    label: 'Spooky',
    kind: 'season',
    price: 120,
    emoji: '🎃',
    blurb: 'Pumpkins after dark.',
  },
  {
    id: 'festive',
    label: 'Festive',
    kind: 'season',
    price: 120,
    emoji: '🎄',
    blurb: 'Holiday red and green.',
  },
  {
    id: 'snowman',
    label: 'Snowman',
    kind: 'reward',
    price: 0,
    emoji: '⛄',
    blurb: 'Winter Season reward. Snow included.',
  },
  {
    id: 'cabin-campfire',
    label: 'Cabin Campfire',
    kind: 'reward',
    price: 0,
    blurb:
      'Winter Season reward. A crackling campfire by a log cabin, with a good dog on the deck.',
  },
]

/**
 * Nametags for sale. Season nametags are no longer sold (players who already
 * bought one keep it in their inventory), and reward nametags are earned only.
 */
export const SHOP_NAMETAGS = NAMETAGS.filter((t) => t.kind === 'color')

const BY_ID = new Map(NAMETAGS.map((t) => [t.id, t]))

export function getNametag(id: string | null | undefined) {
  return id ? BY_ID.get(id) : undefined
}
