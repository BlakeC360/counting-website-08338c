import {
  Crown,
  Flame,
  Gem,
  Infinity as InfinityIcon,
  Rocket,
  Sprout,
  Star,
  type LucideIcon,
} from 'lucide-react'

export type Achievement = {
  goal: number
  title: string
  line: string
  icon: LucideIcon
}

/** Unlocked by correct numbers counted in the live game, all time. */
export const ACHIEVEMENTS: Achievement[] = [
  { goal: 10, title: 'Wee Beginna', line: 'Just a wee beginna.', icon: Sprout },
  { goal: 100, title: 'Triple Digits', line: 'Starting strong.', icon: Rocket },
  {
    goal: 500,
    title: 'In the Groove',
    line: 'Finding your rhythm now.',
    icon: Flame,
  },
  {
    goal: 1000,
    title: 'Grand Counter',
    line: 'Four digits and no fear.',
    icon: Star,
  },
  {
    goal: 5000,
    title: 'Number Cruncher',
    line: 'The numbers fear you now.',
    icon: Gem,
  },
  {
    goal: 10000,
    title: 'Count Royalty',
    line: 'Counting is a lifestyle, not a hobby.',
    icon: Crown,
  },
  {
    goal: 50000,
    title: 'Infinity Itself',
    line: "Infinity's personal assistant. Go touch grass.",
    icon: InfinityIcon,
  },
]

/** Achievements whose goal lies in (before, after]. */
export function newlyUnlocked(before: number, after: number) {
  return ACHIEVEMENTS.filter((a) => a.goal > before && a.goal <= after)
}
