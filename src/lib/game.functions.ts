import { createServerFn } from '@tanstack/react-start'
import {
  and,
  desc,
  eq,
  getTableColumns,
  gt,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index.js'
import {
  counts,
  gameState,
  playerBadges,
  playerFonts,
  playerNametags,
  playerNumberAnims,
  playerTitles,
  players,
  seasonClaims,
  seasonProgress,
  sprints,
} from '../../db/schema.js'
import { requireActivePlayer, requirePlayer } from './auth.functions'
import { currentUser, isAdminUser, resolvePlayer } from './auth.server'
import { getNametag } from './nametags'
import {
  CURRENT_SEASON,
  SPRINT_ACHIEVEMENTS,
  boostFor,
  getNameFont,
  getNumberAnim,
} from './season'

export const coinsExpr = sql<number>`floor(${players.totalCount} + ${players.bonusCoins} + ${players.boostCoins} - ${players.coinsSpent})::int`
const coinsSql = sql`floor(total_count + bonus_coins + boost_coins - coins_spent)`

const SPRINT_SECONDS = 60
const MAX_SPRINT_SCORE = 600 // 10 numbers / second is already superhuman

/** After any change to the live count, nobody can send for this long. */
export const COOLDOWN_MS = 2000
const cooledDown = sql`${gameState.updatedAt} <= now() - make_interval(secs => ${COOLDOWN_MS / 1000})`

const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .transform((s) => s.replace(/\s+/g, ' '))

export type Reason = 'double' | 'wrong'

/**
 * One-way public id for a player. Real ids never leave the server, so nobody
 * can use a leaderboard id to claim someone's pre-sign-in progress.
 */
function publicId(id: string) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  )
}

async function ensureState() {
  await db.insert(gameState).values({ id: 1 }).onConflictDoNothing()
}

async function readState() {
  const [state] = await db
    .select({
      ...getTableColumns(gameState),
      lastPlayerTag: players.nametag,
      lastPlayerTitle: players.title,
      lastPlayerFont: players.font,
      lastPlayerAnim: players.numberAnim,
    })
    .from(gameState)
    .leftJoin(players, eq(players.id, gameState.lastPlayerId))
    .where(eq(gameState.id, 1))
  return state
}

type LastPlayer = {
  tag: string | null
  title: string | null
  font: string | null
  anim: string | null
}

function publicState(
  state: typeof gameState.$inferSelect | undefined,
  lastPlayer: LastPlayer | null = null,
) {
  const has = !!state?.lastPlayerId
  const current = state?.current ?? 0
  return {
    lastPlayerTag: has ? (lastPlayer?.tag ?? null) : null,
    lastPlayerTitle: has ? (lastPlayer?.title ?? null) : null,
    lastPlayerFont: has ? (lastPlayer?.font ?? null) : null,
    /** Number animation equipped by whoever sent the current number. */
    lastPlayerAnim: has ? (lastPlayer?.anim ?? null) : null,
    current,
    record: state?.record ?? 0,
    lastPlayerId: state?.lastPlayerId ? publicId(state.lastPlayerId) : null,
    lastPlayerName: state?.lastPlayerName ?? null,
    /** Streak boost applied to the next correct number. */
    boost: boostFor(current),
    /** Milliseconds left before the live count accepts another number. */
    cooldownMs: state
      ? Math.max(0, COOLDOWN_MS - (Date.now() - state.updatedAt.getTime()))
      : 0,
    lastReset: state?.lastResetAt
      ? {
          by: state.lastResetBy ?? 'someone',
          at: state.lastResetAt.toISOString(),
          from: state.lastResetFrom ?? 0,
          reason: (state.lastResetReason ?? 'wrong') as Reason,
        }
      : null,
  }
}

function joinedState(state: Awaited<ReturnType<typeof readState>>) {
  return publicState(state, {
    tag: state?.lastPlayerTag ?? null,
    title: state?.lastPlayerTitle ?? null,
    font: state?.lastPlayerFont ?? null,
    anim: state?.lastPlayerAnim ?? null,
  })
}

export type GameState = ReturnType<typeof publicState>

export const getLive = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureState()
  return { state: joinedState(await readState()) }
})

async function readProfile(playerId: string) {
  const [
    [me],
    owned,
    titles,
    badges,
    fonts,
    anims,
    [season],
    claims,
    [sprint],
  ] = await Promise.all([
    db
      .select({
        total: players.totalCount,
        coins: coinsExpr,
        nametag: players.nametag,
        title: players.title,
        font: players.font,
        numberAnim: players.numberAnim,
      })
      .from(players)
      .where(eq(players.id, playerId)),
    db
      .select({ id: playerNametags.tagId })
      .from(playerNametags)
      .where(eq(playerNametags.playerId, playerId)),
    db
      .select({ id: playerTitles.titleId })
      .from(playerTitles)
      .where(eq(playerTitles.playerId, playerId)),
    db
      .select({ id: playerBadges.badgeId })
      .from(playerBadges)
      .where(eq(playerBadges.playerId, playerId)),
    db
      .select({ id: playerFonts.fontId })
      .from(playerFonts)
      .where(eq(playerFonts.playerId, playerId)),
    db
      .select({ id: playerNumberAnims.animId })
      .from(playerNumberAnims)
      .where(eq(playerNumberAnims.playerId, playerId)),
    db
      .select({ xp: seasonProgress.xp })
      .from(seasonProgress)
      .where(
        and(
          eq(seasonProgress.playerId, playerId),
          eq(seasonProgress.seasonId, CURRENT_SEASON.id),
        ),
      ),
    db
      .select({ tier: seasonClaims.tier })
      .from(seasonClaims)
      .where(
        and(
          eq(seasonClaims.playerId, playerId),
          eq(seasonClaims.seasonId, CURRENT_SEASON.id),
        ),
      ),
    db
      .select({
        best: sql<number>`coalesce(max(${sprints.score}), 0)::int`,
      })
      .from(sprints)
      .where(eq(sprints.playerId, playerId)),
  ])
  return {
    total: me?.total ?? 0,
    coins: Number(me?.coins ?? 0),
    equipped: me?.nametag ?? null,
    owned: owned.map((o) => o.id),
    equippedTitle: me?.title ?? null,
    titles: titles.map((t) => t.id),
    badges: badges.map((b) => b.id),
    equippedFont: me?.font ?? null,
    fonts: fonts.map((f) => f.id),
    equippedAnim: me?.numberAnim ?? null,
    anims: anims.map((a) => a.id),
    seasonXp: season?.xp ?? 0,
    claimed: claims.map((c) => c.tier),
    bestSprint: Number(sprint?.best ?? 0),
  }
}

export type Profile = Awaited<ReturnType<typeof readProfile>>

/** Grants every sprint title the player's best score has reached. Returns new ones. */
async function grantSprintTitles(playerId: string, best: number) {
  const earned = SPRINT_ACHIEVEMENTS.filter((a) => best >= a.score)
  if (earned.length === 0) return []
  const rows = await db
    .insert(playerTitles)
    .values(earned.map((a) => ({ playerId, titleId: a.titleId })))
    .onConflictDoNothing()
    .returning({ titleId: playerTitles.titleId })
  return rows.map((r) => r.titleId)
}

function meFrom(player: typeof players.$inferSelect, admin: boolean) {
  return {
    id: player.id,
    publicId: publicId(player.id),
    name: player.name,
    banned: player.banned,
    banReason: player.banReason,
    isAdmin: admin,
  }
}

export type Me = ReturnType<typeof meFrom>

/**
 * The signed-in player, or null when signed out. `legacyId` is the browser id
 * from before sign-in was required, so old progress carries over once.
 */
export const getMe = createServerFn({ method: 'POST' })
  .validator(z.object({ legacyId: z.string().uuid().nullable() }))
  .handler(async ({ data }) => {
    const user = await currentUser()
    if (!user) return null
    const player = await resolvePlayer(user, data.legacyId)
    const before = await readProfile(player.id)
    const granted = await grantSprintTitles(player.id, before.bestSprint)
    const profile = granted.length ? await readProfile(player.id) : before
    return { me: meFrom(player, isAdminUser(user)), profile }
  })

export const setName = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(z.object({ name: nameSchema }))
  .handler(async ({ data, context }) => {
    const [row] = await db
      .update(players)
      .set({ name: data.name })
      .where(eq(players.id, context.player.id))
      .returning()
    return meFrom(row!, isAdminUser(context.user))
  })

export const getProfile = createServerFn({ method: 'GET' })
  .middleware([requirePlayer])
  .handler(async ({ context }) => readProfile(context.player.id))

export const sendNumber = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(
    z.object({
      number: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    }),
  )
  .handler(async ({ data, context }) => {
    const { id: playerId, name } = context.player
    const { number } = data
    await ensureState()

    // Atomic: only succeeds if it's the next number, a different player went
    // last, and the cooldown since the last change has passed.
    const [advanced] = await db
      .update(gameState)
      .set({
        current: sql`${gameState.current} + 1`,
        lastPlayerId: playerId,
        lastPlayerName: name,
        record: sql`GREATEST(${gameState.record}, ${gameState.current} + 1)`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(gameState.id, 1),
          sql`${gameState.current} + 1 = ${number}`,
          sql`${gameState.lastPlayerId} IS DISTINCT FROM ${playerId}`,
          cooledDown,
        ),
      )
      .returning()

    if (advanced) {
      // The boost is set by the streak before this number was added.
      const boost = boostFor(advanced.current - 1)
      const xpGain = Math.round(CURRENT_SEASON.xpPerNumber * boost.xp)
      const extraCoins = boost.coins - 1
      await Promise.all([
        db
          .insert(counts)
          .values({ playerId, playerName: name, number, ok: true }),
        db
          .update(players)
          .set({
            totalCount: sql`${players.totalCount} + 1`,
            boostCoins: sql`${players.boostCoins} + ${extraCoins}`,
          })
          .where(eq(players.id, playerId)),
        db
          .insert(seasonProgress)
          .values({ playerId, seasonId: CURRENT_SEASON.id, xp: xpGain })
          .onConflictDoUpdate({
            target: [seasonProgress.playerId, seasonProgress.seasonId],
            set: { xp: sql`${seasonProgress.xp} + ${xpGain}` },
          }),
      ])
      const profile = await readProfile(playerId)
      return {
        ok: true as const,
        state: publicState(advanced, {
          tag: profile.equipped,
          title: profile.equippedTitle,
          font: profile.equippedFont,
          anim: profile.equippedAnim,
        }),
        profile,
        gained: { xp: xpGain, coins: boost.coins, boost },
      }
    }

    const before = await readState()
    const reason: Reason =
      before?.lastPlayerId === playerId ? 'double' : 'wrong'

    const [reset] = await db
      .update(gameState)
      .set({
        current: 0,
        lastPlayerId: null,
        lastPlayerName: null,
        lastResetBy: name,
        lastResetAt: sql`now()`,
        lastResetFrom: sql`${gameState.current}`,
        lastResetReason: reason,
        updatedAt: sql`now()`,
      })
      // Sends during the cooldown are turned away instead of resetting, so two
      // people sending the same number at once don't break the count.
      .where(and(eq(gameState.id, 1), cooledDown))
      .returning()

    if (!reset) {
      return {
        ok: false as const,
        reason: 'cooldown' as const,
        state: joinedState(await readState()),
      }
    }

    await db
      .insert(counts)
      .values({ playerId, playerName: name, number, ok: false, reason })

    return {
      ok: false as const,
      reason,
      expected: (before?.current ?? 0) + 1,
      brokeAt: before?.current ?? 0,
      state: publicState(reset),
    }
  })

export const buyNametag = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(z.object({ tagId: z.string().max(40) }))
  .handler(async ({ data, context }) => {
    const playerId = context.player.id
    const tag = getNametag(data.tagId)
    if (!tag || tag.kind !== 'color') {
      return {
        ok: false as const,
        message: 'That nametag is not for sale.',
        profile: await readProfile(playerId),
      }
    }

    // One statement: charge only if affordable and not already owned, then
    // record ownership and equip it. The players row lock serialises buys.
    const bought = await db.execute(sql`
      WITH paid AS (
        UPDATE ${players}
        SET coins_spent = coins_spent + ${tag.price}, nametag = ${tag.id}
        WHERE id = ${playerId}
          AND ${coinsSql} >= ${tag.price}
          AND NOT EXISTS (
            SELECT 1 FROM ${playerNametags}
            WHERE player_id = ${playerId} AND tag_id = ${tag.id}
          )
        RETURNING id
      )
      INSERT INTO ${playerNametags} (player_id, tag_id)
      SELECT id, ${tag.id} FROM paid
      ON CONFLICT DO NOTHING
      RETURNING tag_id
    `)

    const profile = await readProfile(playerId)
    if (bought.rows.length === 0) {
      return {
        ok: false as const,
        message: profile.owned.includes(tag.id)
          ? 'You already own that nametag.'
          : `That nametag costs ${tag.price.toLocaleString('en-US')} coins.`,
        profile,
      }
    }
    return { ok: true as const, message: null, profile }
  })

export const equipNametag = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(z.object({ tagId: z.string().max(40).nullable() }))
  .handler(async ({ data, context }) => {
    const playerId = context.player.id
    if (data.tagId) {
      const [owned] = await db
        .select({ tagId: playerNametags.tagId })
        .from(playerNametags)
        .where(
          and(
            eq(playerNametags.playerId, playerId),
            eq(playerNametags.tagId, data.tagId),
          ),
        )
      if (!owned) {
        return { ok: false as const, profile: await readProfile(playerId) }
      }
    }
    await db
      .update(players)
      .set({ nametag: data.tagId })
      .where(eq(players.id, playerId))
    return { ok: true as const, profile: await readProfile(playerId) }
  })

export const equipTitle = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(z.object({ titleId: z.string().max(40).nullable() }))
  .handler(async ({ data, context }) => {
    const playerId = context.player.id
    if (data.titleId) {
      const [owned] = await db
        .select({ titleId: playerTitles.titleId })
        .from(playerTitles)
        .where(
          and(
            eq(playerTitles.playerId, playerId),
            eq(playerTitles.titleId, data.titleId),
          ),
        )
      if (!owned) {
        return { ok: false as const, profile: await readProfile(playerId) }
      }
    }
    await db
      .update(players)
      .set({ title: data.titleId })
      .where(eq(players.id, playerId))
    return { ok: true as const, profile: await readProfile(playerId) }
  })

export const equipFont = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(z.object({ fontId: z.string().max(40).nullable() }))
  .handler(async ({ data, context }) => {
    const playerId = context.player.id
    if (data.fontId) {
      const [owned] = await db
        .select({ fontId: playerFonts.fontId })
        .from(playerFonts)
        .where(
          and(
            eq(playerFonts.playerId, playerId),
            eq(playerFonts.fontId, data.fontId),
          ),
        )
      if (!owned || !getNameFont(data.fontId)) {
        return { ok: false as const, profile: await readProfile(playerId) }
      }
    }
    await db
      .update(players)
      .set({ font: data.fontId })
      .where(eq(players.id, playerId))
    return { ok: true as const, profile: await readProfile(playerId) }
  })

export const equipNumberAnim = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(z.object({ animId: z.string().max(40).nullable() }))
  .handler(async ({ data, context }) => {
    const playerId = context.player.id
    if (data.animId) {
      const [owned] = await db
        .select({ animId: playerNumberAnims.animId })
        .from(playerNumberAnims)
        .where(
          and(
            eq(playerNumberAnims.playerId, playerId),
            eq(playerNumberAnims.animId, data.animId),
          ),
        )
      if (!owned || !getNumberAnim(data.animId)) {
        return { ok: false as const, profile: await readProfile(playerId) }
      }
    }
    await db
      .update(players)
      .set({ numberAnim: data.animId })
      .where(eq(players.id, playerId))
    return { ok: true as const, profile: await readProfile(playerId) }
  })

export const claimSeasonReward = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(z.object({ tier: z.number().int().min(1).max(100) }))
  .handler(async ({ data, context }) => {
    const playerId = context.player.id
    const { tier } = data
    const def = CURRENT_SEASON.tiers[tier - 1]
    if (!def?.reward || def.xp === null) {
      return {
        ok: false as const,
        message: 'That reward is not available yet.',
        profile: await readProfile(playerId),
      }
    }

    const seasonId = CURRENT_SEASON.id
    const reward = def.reward
    // The claim row is inserted only if the player has enough XP and hasn't
    // claimed it before; the reward is granted in the same statement.
    const grant =
      reward.type === 'coins'
        ? sql`UPDATE ${players} SET bonus_coins = bonus_coins + ${reward.amount}
              WHERE id IN (SELECT player_id FROM claim) RETURNING id`
        : reward.type === 'title'
          ? sql`INSERT INTO ${playerTitles} (player_id, title_id)
                SELECT player_id, ${reward.titleId} FROM claim
                ON CONFLICT DO NOTHING RETURNING player_id`
          : reward.type === 'badge'
            ? sql`INSERT INTO ${playerBadges} (player_id, badge_id)
                  SELECT player_id, ${reward.badgeId} FROM claim
                  ON CONFLICT DO NOTHING RETURNING player_id`
            : reward.type === 'font'
              ? sql`INSERT INTO ${playerFonts} (player_id, font_id)
                    SELECT player_id, ${reward.fontId} FROM claim
                    ON CONFLICT DO NOTHING RETURNING player_id`
              : reward.type === 'numberAnim'
                ? sql`INSERT INTO ${playerNumberAnims} (player_id, anim_id)
                      SELECT player_id, ${reward.animId} FROM claim
                      ON CONFLICT DO NOTHING RETURNING player_id`
                : sql`INSERT INTO ${playerNametags} (player_id, tag_id)
                    SELECT player_id, ${reward.tagId} FROM claim
                    ON CONFLICT DO NOTHING RETURNING player_id`

    const result = await db.execute(sql`
      WITH claim AS (
        INSERT INTO ${seasonClaims} (player_id, season_id, tier)
        SELECT player_id, season_id, ${tier} FROM ${seasonProgress}
        WHERE player_id = ${playerId} AND season_id = ${seasonId}
          AND xp >= ${def.xp}
        ON CONFLICT DO NOTHING
        RETURNING player_id
      ),
      granted AS (${grant})
      SELECT player_id FROM claim
    `)

    const profile = await readProfile(playerId)
    if (result.rows.length === 0) {
      return {
        ok: false as const,
        message: profile.claimed.includes(tier)
          ? 'You already claimed that reward.'
          : `You need ${def.xp - profile.seasonXp} more XP.`,
        profile,
      }
    }
    return { ok: true as const, message: null, profile }
  })

export const getLeaderboards = createServerFn({ method: 'GET' }).handler(
  async () => {
    const countExpr = sql<number>`count(*)::int`
    const bestExpr = sql<number>`max(${sprints.score})::int`
    const cols = {
      id: players.id,
      name: players.name,
      nametag: players.nametag,
      title: players.title,
      font: players.font,
    }
    const group = [
      players.id,
      players.name,
      players.nametag,
      players.title,
      players.font,
    ] as const
    const notBanned = eq(players.banned, false)

    const [allTime, today, sprint] = await Promise.all([
      db
        .select({ ...cols, value: players.totalCount })
        .from(players)
        .where(and(gt(players.totalCount, 0), notBanned))
        .orderBy(desc(players.totalCount))
        .limit(10),
      db
        .select({ ...cols, value: countExpr })
        .from(counts)
        .innerJoin(players, eq(counts.playerId, players.id))
        .where(
          and(
            eq(counts.ok, true),
            notBanned,
            gt(counts.createdAt, sql`now() - interval '24 hours'`),
          ),
        )
        .groupBy(...group)
        .orderBy(desc(countExpr))
        .limit(10),
      db
        .select({ ...cols, value: bestExpr })
        .from(sprints)
        .innerJoin(players, eq(sprints.playerId, players.id))
        .where(and(isNotNull(sprints.score), gt(sprints.score, 0), notBanned))
        .groupBy(...group)
        .orderBy(desc(bestExpr))
        .limit(10),
    ])

    const pub = <T extends { id: string }>(rows: T[]) =>
      rows.map((r) => ({ ...r, id: publicId(r.id) }))
    return { allTime: pub(allTime), today: pub(today), sprint: pub(sprint) }
  },
)

export type LeaderRow = {
  id: string
  name: string
  nametag: string | null
  title: string | null
  font: string | null
  value: number
}

export const startSprint = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .handler(async ({ context }) => {
    const id = crypto.randomUUID()
    await db.insert(sprints).values({
      id,
      playerId: context.player.id,
      playerName: context.player.name,
    })
    return { sprintId: id, seconds: SPRINT_SECONDS }
  })

export const finishSprint = createServerFn({ method: 'POST' })
  .middleware([requireActivePlayer])
  .validator(
    z.object({
      sprintId: z.string().uuid(),
      score: z.number().int().nonnegative(),
    }),
  )
  .handler(async ({ data, context }) => {
    const playerId = context.player.id
    const [run] = await db
      .select({
        elapsed: sql<number>`extract(epoch from (now() - ${sprints.startedAt}))::float`,
      })
      .from(sprints)
      .where(
        and(
          eq(sprints.id, data.sprintId),
          eq(sprints.playerId, playerId),
          isNull(sprints.finishedAt),
        ),
      )

    if (!run) return { accepted: false as const, message: 'Sprint not found.' }

    const elapsed = Number(run.elapsed)
    // Allow a little slack for network latency either side.
    const valid =
      elapsed >= SPRINT_SECONDS - 3 &&
      elapsed <= SPRINT_SECONDS + 30 &&
      data.score <= MAX_SPRINT_SCORE

    await db
      .update(sprints)
      .set({ finishedAt: sql`now()`, score: valid ? data.score : 0 })
      .where(eq(sprints.id, data.sprintId))

    if (!valid)
      return {
        accepted: false as const,
        message: 'That run could not be verified.',
      }

    const [best] = await db
      .select({ best: sql<number>`coalesce(max(${sprints.score}), 0)::int` })
      .from(sprints)
      .where(eq(sprints.playerId, playerId))
    const bestScore = Number(best?.best ?? 0)
    const newTitles = await grantSprintTitles(playerId, bestScore)

    return {
      accepted: true as const,
      score: data.score,
      best: bestScore,
      newTitles,
      profile: await readProfile(playerId),
    }
  })
