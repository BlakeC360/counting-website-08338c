// Server-only helpers. Import them only inside server function handlers or
// middleware `.server()` callbacks so they stay out of the browser bundle.
import { getUser, type User } from '@netlify/identity'
import { and, eq, isNull } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { players } from '../../db/schema.js'

/** Google accounts that get the admin page. Users with the Identity `admin` role do too. */
const ADMIN_EMAILS = ['blakecurtis360@gmail.com']

export function isAdminUser(user: User) {
  if (user.roles?.includes('admin')) return true
  const email = user.email?.toLowerCase()
  return user.provider === 'google' && !!email && ADMIN_EMAILS.includes(email)
}

/** Only Google sign-ins can play (admins with the Identity role are allowed too). */
function canPlay(user: User) {
  return user.provider === 'google' || isAdminUser(user)
}

function defaultName(user: User) {
  const raw = user.name || user.email?.split('@')[0] || 'Counter'
  return raw.trim().replace(/\s+/g, ' ').slice(0, 24) || 'Counter'
}

export type PlayerRow = typeof players.$inferSelect

/**
 * Finds (or creates) the player row owned by a signed-in user. A player from
 * before sign-in was required can be claimed once via its old browser id.
 */
export async function resolvePlayer(
  user: User,
  legacyId?: string | null,
): Promise<PlayerRow> {
  const [existing] = await db
    .select()
    .from(players)
    .where(eq(players.userId, user.id))
  if (existing) {
    if (user.email && existing.email !== user.email) {
      await db
        .update(players)
        .set({ email: user.email })
        .where(eq(players.id, existing.id))
    }
    return existing
  }

  if (legacyId) {
    const [claimed] = await db
      .update(players)
      .set({ userId: user.id, email: user.email ?? null })
      .where(and(eq(players.id, legacyId), isNull(players.userId)))
      .returning()
    if (claimed) return claimed
  }

  await db
    .insert(players)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email ?? null,
      name: defaultName(user),
    })
    .onConflictDoNothing()
  const [created] = await db
    .select()
    .from(players)
    .where(eq(players.userId, user.id))
  return created!
}

export async function currentUser() {
  const user = await getUser()
  if (!user || !canPlay(user)) return null
  return user
}
