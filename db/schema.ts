import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Singleton row (id = 1) holding the live shared count.
export const gameState = pgTable('game_state', {
  id: integer().primaryKey(),
  current: bigint({ mode: 'number' }).notNull().default(0),
  lastPlayerId: text('last_player_id'),
  lastPlayerName: text('last_player_name'),
  record: bigint({ mode: 'number' }).notNull().default(0),
  lastResetBy: text('last_reset_by'),
  lastResetAt: timestamp('last_reset_at', { withTimezone: true }),
  lastResetFrom: bigint('last_reset_from', { mode: 'number' }),
  lastResetReason: text('last_reset_reason'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const players = pgTable(
  'players',
  {
    id: text().primaryKey(),
    // Netlify Identity (Google) user id that owns this player. Null only for
    // players from before sign-in was required, until their owner claims them.
    userId: text('user_id'),
    // Sign-in email, only ever shown on the admin page.
    email: text(),
    banned: boolean().notNull().default(false),
    banReason: text('ban_reason'),
    // Extra coins from live-count streak boosts (fractional, e.g. +0.25 a number).
    boostCoins: doublePrecision('boost_coins').notNull().default(0),
    // Id of the equipped name font from src/lib/season.ts, or null for default.
    font: text(),
    // Id of the equipped live-count number animation from src/lib/season.ts, or null for none.
    numberAnim: text('number_anim'),
    name: text().notNull(),
    totalCount: integer('total_count').notNull().default(0),
    // Coins: 1 per correct live number plus bonusCoins; balance = totalCount + bonusCoins - coinsSpent.
    coinsSpent: integer('coins_spent').notNull().default(0),
    // Id of the equipped nametag from src/lib/nametags.ts, or null for plain.
    nametag: text(),
    // Coins granted by season rewards, on top of the 1 per number counted.
    bonusCoins: integer('bonus_coins').notNull().default(0),
    // Id of the equipped title from src/lib/season.ts, or null for none.
    title: text(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('players_user_id_idx').on(t.userId)],
)

// Every number anyone sends, correct or not.
export const counts = pgTable(
  'counts',
  {
    id: serial().primaryKey(),
    playerId: text('player_id').notNull(),
    playerName: text('player_name').notNull(),
    number: bigint({ mode: 'number' }).notNull(),
    ok: boolean().notNull(),
    reason: text(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('counts_created_at_idx').on(t.createdAt),
    index('counts_player_created_idx').on(t.playerId, t.createdAt),
  ],
)

// Solo 60-second sprint attempts.
export const sprints = pgTable(
  'sprints',
  {
    id: text().primaryKey(),
    playerId: text('player_id').notNull(),
    playerName: text('player_name').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    score: integer(),
  },
  (t) => [index('sprints_score_idx').on(t.score)],
)

// Nametags each player has bought from the shop.
export const playerNametags = pgTable(
  'player_nametags',
  {
    playerId: text('player_id').notNull(),
    tagId: text('tag_id').notNull(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.tagId] })],
)

// Titles each player owns (earned from season rewards).
export const playerTitles = pgTable(
  'player_titles',
  {
    playerId: text('player_id').notNull(),
    titleId: text('title_id').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.titleId] })],
)

// Season pass XP per player per season.
export const seasonProgress = pgTable(
  'season_progress',
  {
    playerId: text('player_id').notNull(),
    seasonId: text('season_id').notNull(),
    xp: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.seasonId] })],
)

// Season rewards a player has claimed (tier = 1-based reward number).
export const seasonClaims = pgTable(
  'season_claims',
  {
    playerId: text('player_id').notNull(),
    seasonId: text('season_id').notNull(),
    tier: integer().notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.seasonId, t.tier] })],
)

// Badges each player has earned (kept forever as a keepsake).
export const playerBadges = pgTable(
  'player_badges',
  {
    playerId: text('player_id').notNull(),
    badgeId: text('badge_id').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.badgeId] })],
)

// Name fonts each player owns.
export const playerFonts = pgTable(
  'player_fonts',
  {
    playerId: text('player_id').notNull(),
    fontId: text('font_id').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.fontId] })],
)

// Number animations each player owns (shown on the live count number they sent last).
export const playerNumberAnims = pgTable(
  'player_number_anims',
  {
    playerId: text('player_id').notNull(),
    animId: text('anim_id').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.animId] })],
)
