import { createServerFn } from '@tanstack/react-start'
import { desc, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index.js'
import {
  playerBadges,
  playerFonts,
  playerNametags,
  playerNumberAnims,
  playerTitles,
  players,
  seasonProgress,
} from '../../db/schema.js'
import { requireAdmin } from './auth.functions'
import { resolvePlayer } from './auth.server'
import { coinsExpr } from './game.functions'
import { NAMETAGS } from './nametags'
import {
  BADGES,
  CURRENT_SEASON,
  NAME_FONTS,
  NUMBER_ANIMS,
  TITLES,
} from './season'

const adminRow = {
  id: players.id,
  name: players.name,
  email: players.email,
  total: players.totalCount,
  coins: coinsExpr,
  banned: players.banned,
  banReason: players.banReason,
  signedIn: sql<boolean>`${players.userId} IS NOT NULL`,
  createdAt: players.createdAt,
}

async function readRow(id: string) {
  const [row] = await db
    .select(adminRow)
    .from(players)
    .where(eq(players.id, id))
  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null
}

export type AdminPlayer = NonNullable<Awaited<ReturnType<typeof readRow>>>

/** Whether the signed-in user is an admin (for showing the admin page). */
export const getAdminStatus = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async ({ context }) => ({ email: context.admin.email ?? null }))

export const adminListPlayers = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .validator(z.object({ q: z.string().trim().max(80) }))
  .handler(async ({ data }) => {
    const like = `%${data.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    const rows = await db
      .select(adminRow)
      .from(players)
      .where(
        data.q
          ? or(ilike(players.name, like), ilike(players.email, like))
          : undefined,
      )
      .orderBy(desc(players.totalCount))
      .limit(50)
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  })

export const adminUpdatePlayer = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(
    z.discriminatedUnion('action', [
      z.object({
        action: z.literal('setCoins'),
        playerId: z.string().max(80),
        coins: z.number().int().min(0).max(100_000_000),
      }),
      z.object({
        action: z.literal('addCoins'),
        playerId: z.string().max(80),
        amount: z.number().int().min(-100_000_000).max(100_000_000),
      }),
      z.object({
        action: z.literal('ban'),
        playerId: z.string().max(80),
        reason: z.string().trim().max(200),
      }),
      z.object({ action: z.literal('unban'), playerId: z.string().max(80) }),
      z.object({
        action: z.literal('rename'),
        playerId: z.string().max(80),
        name: z
          .string()
          .trim()
          .min(1)
          .max(24)
          .transform((s) => s.replace(/\s+/g, ' ')),
      }),
    ]),
  )
  .handler(async ({ data }) => {
    const id = data.playerId
    switch (data.action) {
      case 'setCoins':
        // Adjust bonus coins so the balance lands exactly on the target.
        await db
          .update(players)
          .set({
            bonusCoins: sql`${players.bonusCoins} + (${data.coins} - ${coinsExpr})`,
          })
          .where(eq(players.id, id))
        break
      case 'addCoins':
        await db
          .update(players)
          .set({
            bonusCoins: sql`${players.bonusCoins} + GREATEST(${data.amount}, -${coinsExpr})`,
          })
          .where(eq(players.id, id))
        break
      case 'ban':
        await db
          .update(players)
          .set({ banned: true, banReason: data.reason || null })
          .where(eq(players.id, id))
        break
      case 'unban':
        await db
          .update(players)
          .set({ banned: false, banReason: null })
          .where(eq(players.id, id))
        break
      case 'rename':
        await db
          .update(players)
          .set({ name: data.name })
          .where(eq(players.id, id))
        break
    }
    const row = await readRow(id)
    if (!row) throw new Error('Player not found.')
    return row
  })

/**
 * Testing helper: gives the signed-in admin's own player every nametag (shop,
 * season and reward), title, badge, name font and number animation, and enough
 * season XP to claim every season reward. Rewards stay unclaimed so the claim
 * flow can still be tried.
 */
export const adminUnlockEverything = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const player = await resolvePlayer(context.admin)
    const playerId = player.id
    const maxXp = Math.max(0, ...CURRENT_SEASON.tiers.map((t) => t.xp ?? 0))
    await Promise.all([
      db
        .insert(playerNametags)
        .values(NAMETAGS.map((t) => ({ playerId, tagId: t.id })))
        .onConflictDoNothing(),
      db
        .insert(playerTitles)
        .values(TITLES.map((t) => ({ playerId, titleId: t.id })))
        .onConflictDoNothing(),
      db
        .insert(playerBadges)
        .values(BADGES.map((b) => ({ playerId, badgeId: b.id })))
        .onConflictDoNothing(),
      db
        .insert(playerFonts)
        .values(NAME_FONTS.map((f) => ({ playerId, fontId: f.id })))
        .onConflictDoNothing(),
      db
        .insert(playerNumberAnims)
        .values(NUMBER_ANIMS.map((a) => ({ playerId, animId: a.id })))
        .onConflictDoNothing(),
      db
        .insert(seasonProgress)
        .values({ playerId, seasonId: CURRENT_SEASON.id, xp: maxXp })
        .onConflictDoUpdate({
          target: [seasonProgress.playerId, seasonProgress.seasonId],
          set: { xp: sql`GREATEST(${seasonProgress.xp}, ${maxXp})` },
        }),
    ])
    return {
      nametags: NAMETAGS.length,
      titles: TITLES.length,
      badges: BADGES.length,
      fonts: NAME_FONTS.length,
      anims: NUMBER_ANIMS.length,
      seasonXp: maxXp,
    }
  })
