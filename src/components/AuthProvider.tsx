import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getSettings,
  getUser,
  handleAuthCallback,
  logout,
  oauthLogin,
  onAuthChange,
} from '@netlify/identity'
import { toast } from 'sonner'

import { getMe, type Me, type Profile } from '@/lib/game.functions'

/** Browser id from before Google sign-in was required (used once to carry progress over). */
const LEGACY_ID_KEY = 'infinite-count:player-id'

type AuthState = {
  /** False until the browser session has been checked. */
  ready: boolean
  /** Signed in with an account that isn't Google. */
  wrongProvider: boolean
  me: Me | null
  profile: Profile | null
  setMe: (me: Me) => void
  setProfile: (profile: Profile) => void
  signIn: () => void
  signOut: () => Promise<void>
  reload: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const CALLBACK_KEYS = [
  'access_token',
  'error',
  'confirmation_token',
  'recovery_token',
  'invite_token',
  'email_change_token',
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [wrongProvider, setWrongProvider] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const reload = useCallback(async () => {
    try {
      const user = await getUser()
      if (!user) {
        setMe(null)
        setProfile(null)
        setWrongProvider(false)
        return
      }
      const legacyId = localStorage.getItem(LEGACY_ID_KEY)
      const res = await getMe({ data: { legacyId } })
      if (!res) {
        setMe(null)
        setProfile(null)
        setWrongProvider(true)
        return
      }
      if (legacyId) localStorage.removeItem(LEGACY_ID_KEY)
      setWrongProvider(false)
      setMe(res.me)
      setProfile(res.profile)
    } catch {
      toast.error('Could not load your account. Refresh to try again.')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthChange((event) => {
      if (active && (event === 'login' || event === 'logout')) void reload()
    })
    async function init() {
      const hash = new URLSearchParams(window.location.hash.slice(1))
      if (CALLBACK_KEYS.some((k) => hash.has(k))) {
        try {
          await handleAuthCallback()
        } catch {
          toast.error('Google sign-in did not complete. Try again.')
        }
        history.replaceState(null, '', window.location.pathname)
      }
      if (active) await reload()
    }
    void init()
    return () => {
      active = false
      unsubscribe()
    }
  }, [reload])

  const signIn = useCallback(() => {
    void (async () => {
      try {
        // Check first so players never land on Identity's raw
        // "Provider is not enabled" JSON error page.
        const settings = await getSettings()
        if (!settings.providers.google) {
          toast.error('Google sign-in is not switched on for this site yet.')
          return
        }
        oauthLogin('google')
      } catch {
        toast.error('Google sign-in is not available right now.')
      }
    })()
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logout()
    } finally {
      setMe(null)
      setProfile(null)
      setWrongProvider(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      ready,
      wrongProvider,
      me,
      profile,
      setMe,
      setProfile,
      signIn,
      signOut,
      reload,
    }),
    [ready, wrongProvider, me, profile, signIn, signOut, reload],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const state = useContext(AuthContext)
  if (!state) throw new Error('AuthProvider is required')
  return state
}
