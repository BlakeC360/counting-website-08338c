import { createMiddleware } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'

import { currentUser, isAdminUser, resolvePlayer } from './auth.server'

/** Requires a Google sign-in; puts the user and their player row in context. */
export const requirePlayer = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const user = await currentUser()
    if (!user) throw new Error('Sign in with Google to play.')
    const player = await resolvePlayer(user)
    return next({ context: { user, player } })
  },
)

/** Like requirePlayer, but rejects banned players. */
export const requireActivePlayer = createMiddleware({ type: 'function' })
  .middleware([requirePlayer])
  .server(async ({ next, context }) => {
    if (context.player.banned) throw new Error('Your account is banned.')
    return next()
  })

export const requireAdmin = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const user = await getUser()
    if (!user || !isAdminUser(user)) throw new Error('Admins only.')
    return next({ context: { admin: user } })
  },
)
