export type Title = { id: string; text: string }

/** Titles that can be shown on a nameplate. Ids are stored in the database. */
export const TITLES: Title[] = [
  { id: 'cold-dingers', text: "Cold dingers don't slow me down" },
  { id: 'roasty-toasty', text: 'Roasty toasty' },
  { id: 'need-for-speed', text: 'Need for speed' },
  { id: 'breakin-records', text: 'Breakin records' },
  { id: 'certified-professional', text: 'Certified Professional' },
  { id: 'shouldnt-be-possible', text: "This shouldn't be possible" },
]

const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]))

export function getTitle(id: string | null | undefined) {
  return id ? TITLE_BY_ID.get(id) : undefined
}

export type Badge = {
  id: string
  name: string
  description: string
  image: string
  alt: string
}

/** Keepsake badges shown in the inventory. Ids are stored in the database. */
export const BADGES: Badge[] = [
  {
    id: 'og-it-is',
    name: 'OG it is!',
    description:
      '2026 launch badge, earned by reaching reward 7 in the 1st season.',
    image: '/badges/og-it-is.webp',
    alt: 'A person in a camp chair by a campfire in a snowy winter forest, with a log cabin to their right',
  },
]

const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]))

export function getBadge(id: string | null | undefined) {
  return id ? BADGE_BY_ID.get(id) : undefined
}

export type NameFont = { id: string; label: string; className: string }

/** Fonts a display name can be shown in. Ids are stored in the database. */
export const NAME_FONTS: NameFont[] = [
  { id: 'alegreya', label: 'Alegreya', className: 'name-font-alegreya' },
]

const FONT_BY_ID = new Map(NAME_FONTS.map((f) => [f.id, f]))

export function getNameFont(id: string | null | undefined) {
  return id ? FONT_BY_ID.get(id) : undefined
}

export type NumberAnim = {
  id: string
  label: string
  className: string
  blurb: string
}

/**
 * Animations shown on the live-count number a player sent last, until someone
 * sends the next one. Ids are stored in the database, so never rename one.
 */
export const NUMBER_ANIMS: NumberAnim[] = [
  {
    id: 'red-flame',
    label: 'Red Flame',
    className: 'num-anim-red-flame',
    blurb: 'Your number burns red hot.',
  },
  {
    id: '8-bit',
    label: '8-Bit',
    className: 'num-anim-8-bit',
    blurb: 'A glowing retro pixel number.',
  },
]

const ANIM_BY_ID = new Map(NUMBER_ANIMS.map((a) => [a.id, a]))

export function getNumberAnim(id: string | null | undefined) {
  return id ? ANIM_BY_ID.get(id) : undefined
}

export type Reward =
  | { type: 'coins'; amount: number }
  | { type: 'title'; titleId: string }
  | { type: 'nametag'; tagId: string }
  | { type: 'badge'; badgeId: string }
  | { type: 'font'; fontId: string }
  | { type: 'numberAnim'; animId: string }

export type Tier = { xp: number; reward: Reward } | { xp: null; reward: null }

export type Season = {
  id: string
  name: string
  emoji: string
  xpPerNumber: number
  /** Reward tiers in order; `xp: null` tiers are placeholders shown as "coming soon". */
  tiers: Tier[]
}

/** The season that's running now. Change `id` when a new season starts. */
export const CURRENT_SEASON: Season = {
  id: 'winter-2026',
  name: 'Winter Season',
  emoji: '❄️',
  xpPerNumber: 25,
  tiers: [
    { xp: 100, reward: { type: 'coins', amount: 50 } },
    { xp: 500, reward: { type: 'title', titleId: 'cold-dingers' } },
    { xp: 750, reward: { type: 'coins', amount: 100 } },
    { xp: 1250, reward: { type: 'coins', amount: 100 } },
    { xp: 1750, reward: { type: 'nametag', tagId: 'snowman' } },
    { xp: 2250, reward: { type: 'title', titleId: 'roasty-toasty' } },
    { xp: 3000, reward: { type: 'badge', badgeId: 'og-it-is' } },
    { xp: 4500, reward: { type: 'coins', amount: 200 } },
    { xp: 5000, reward: { type: 'coins', amount: 200 } },
    { xp: 5999, reward: { type: 'font', fontId: 'alegreya' } },
    { xp: 7000, reward: { type: 'numberAnim', animId: 'red-flame' } },
    { xp: 8000, reward: { type: 'coins', amount: 300 } },
    { xp: 9000, reward: { type: 'nametag', tagId: 'cabin-campfire' } },
    { xp: 9999, reward: { type: 'numberAnim', animId: '8-bit' } },
    { xp: 11050, reward: { type: 'coins', amount: 350 } },
    ...Array.from({ length: 5 }, () => ({ xp: null, reward: null })),
  ],
}

/** Live-count streak boost: every 10 numbers in a row adds +0.5x XP and +0.25x coins. */
export const BOOST_EVERY = 10
export function boostFor(current: number) {
  const level = Math.floor(Math.max(0, current) / BOOST_EVERY)
  return { level, xp: 1 + 0.5 * level, coins: 1 + 0.25 * level }
}

export type SprintAchievement = { score: number; titleId: string }

/** Titles earned by reaching a score in one 60-second sprint. */
export const SPRINT_ACHIEVEMENTS: SprintAchievement[] = [
  { score: 100, titleId: 'need-for-speed' },
  { score: 150, titleId: 'breakin-records' },
  { score: 200, titleId: 'certified-professional' },
  { score: 300, titleId: 'shouldnt-be-possible' },
]
