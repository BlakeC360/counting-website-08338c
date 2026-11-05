import { useCallback, useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeft,
  Ban,
  Coins,
  Gift,
  Search,
  Shield,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/components/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  adminListPlayers,
  adminUnlockEverything,
  adminUpdatePlayer,
  type AdminPlayer,
} from '@/lib/admin.functions'
import { formatNumber } from '@/lib/player'

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Admin · Infinite Count' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminPage,
})

function AdminPage() {
  const { ready, me, signIn, signOut } = useAuth()

  return (
    <div className="grain min-h-screen">
      <main className="mx-auto max-w-content px-5 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the count
        </Link>
        <h1 className="mt-4 flex items-center gap-2 font-display text-4xl font-extrabold">
          <Shield className="size-8 text-primary" /> Admin
        </h1>

        {!ready ? (
          <Skeleton className="mt-8 h-40 rounded-3xl" />
        ) : !me ? (
          <section className="mt-8 max-w-md rounded-3xl border border-border bg-card/70 p-6">
            <h2 className="font-display text-xl font-bold">Admin sign-in</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with the admin Google account to manage players.
            </p>
            <Button className="mt-5" onClick={signIn}>
              Sign in with Google
            </Button>
          </section>
        ) : !me.isAdmin ? (
          <section className="mt-8 max-w-md rounded-3xl border border-border bg-card/70 p-6">
            <h2 className="font-display text-xl font-bold">Not an admin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This Google account doesn't have admin access. Sign out and sign
              in with the admin account.
            </p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </section>
        ) : (
          <>
            <TestingTools />
            <PlayerManager />
          </>
        )}
      </main>
    </div>
  )
}

function TestingTools() {
  const { reload } = useAuth()
  const [busy, setBusy] = useState(false)

  async function unlock() {
    setBusy(true)
    try {
      const res = await adminUnlockEverything()
      await reload()
      toast.success('Everything unlocked on your account', {
        description: `${res.nametags} nametags, ${res.titles} titles, ${res.badges} badges, ${res.fonts} fonts, ${res.anims} number animations, and ${formatNumber(res.seasonXp)} season XP so you can claim every reward.`,
      })
    } catch {
      toast.error('Could not unlock everything. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 max-w-2xl rounded-3xl border border-border bg-card/70 p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Gift className="size-5 text-primary" />
        Testing tools
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Adds every nametag (shop, season and reward), title, badge, name font
        and number animation to your own account, and raises your season XP high
        enough to claim every season reward. Rewards stay unclaimed so you can
        try claiming them. Equip things from the Inventory tab.
      </p>
      <Button className="mt-4" disabled={busy} onClick={() => void unlock()}>
        <Gift className="size-4" />
        {busy ? 'Unlocking…' : 'Unlock everything on my account'}
      </Button>
    </section>
  )
}

function PlayerManager() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdminPlayer[] | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async (query: string) => {
    setError(false)
    try {
      setRows(await adminListPlayers({ data: { q: query } }))
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(q), 250)
    return () => clearTimeout(t)
  }, [q, load])

  const replace = (row: AdminPlayer) =>
    setRows((prev) => prev?.map((r) => (r.id === row.id ? row : r)) ?? null)

  return (
    <section className="mt-8 space-y-4">
      <div className="relative max-w-md">
        <Label htmlFor="admin-search" className="sr-only">
          Search players
        </Label>
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="admin-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          className="bg-card pl-9"
        />
      </div>

      {error ? (
        <p className="rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
          Could not load players.{' '}
          <button className="underline" onClick={() => void load(q)}>
            Retry
          </button>
        </p>
      ) : rows === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No players found.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <PlayerCard
              key={`${r.id}:${r.coins}:${r.banned}`}
              row={r}
              onChange={replace}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

type Action = Parameters<typeof adminUpdatePlayer>[0]['data']

function PlayerCard({
  row,
  onChange,
}: {
  row: AdminPlayer
  onChange: (row: AdminPlayer) => void
}) {
  const [coins, setCoins] = useState(String(row.coins))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(data: Action, done: string) {
    setBusy(true)
    try {
      onChange(await adminUpdatePlayer({ data }))
      toast.success(done)
    } catch {
      toast.error('That change failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const target = Number(coins)
  const validCoins = coins !== '' && Number.isSafeInteger(target) && target >= 0

  return (
    <li className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {row.name}
            {row.banned && <Badge variant="destructive">Banned</Badge>}
            {!row.signedIn && <Badge variant="outline">Not signed in</Badge>}
          </p>
          <p className="text-sm text-muted-foreground">
            {row.email ?? 'No email'} · {formatNumber(row.total)} numbers ·{' '}
            <span className="inline-flex items-center gap-1">
              <Coins className="size-3.5 text-primary" />
              {formatNumber(row.coins)}
            </span>
          </p>
          {row.banned && row.banReason && (
            <p className="mt-1 text-sm text-destructive">
              Reason: {row.banReason}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (validCoins)
              void run(
                { action: 'setCoins', playerId: row.id, coins: target },
                `${row.name} now has ${formatNumber(target)} coins.`,
              )
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor={`coins-${row.id}`} className="text-xs">
              Coin balance
            </Label>
            <Input
              id={`coins-${row.id}`}
              inputMode="numeric"
              value={coins}
              onChange={(e) => setCoins(e.target.value.replace(/\D/g, ''))}
              className="h-9 w-32 font-mono"
            />
          </div>
          <Button size="sm" type="submit" disabled={busy || !validCoins}>
            Set coins
          </Button>
        </form>

        {row.banned ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(
                { action: 'unban', playerId: row.id },
                `${row.name} was unbanned.`,
              )
            }
          >
            <Undo2 className="size-4" /> Unban
          </Button>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void run(
                { action: 'ban', playerId: row.id, reason },
                `${row.name} was banned.`,
              )
            }}
          >
            <div className="grid gap-1">
              <Label htmlFor={`reason-${row.id}`} className="text-xs">
                Ban reason (optional)
              </Label>
              <Input
                id={`reason-${row.id}`}
                value={reason}
                maxLength={200}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 w-56"
              />
            </div>
            <Button size="sm" variant="destructive" disabled={busy}>
              <Ban className="size-4" /> Ban
            </Button>
          </form>
        )}
      </div>
    </li>
  )
}
