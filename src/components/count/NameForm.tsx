import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Nametag, PlayerTitle } from '@/components/count/Nametag'
import { Input } from '@/components/ui/input'
import { setName, type Me } from '@/lib/game.functions'

type Props = {
  me: Me
  tag?: string | null
  title?: string | null
  font?: string | null
  onSaved: (me: Me) => void
}

/** The signed-in player's nameplate, with an inline editor for the display name. */
export function NameForm({ me, tag, title, font, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(me.name)
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <button
        type="button"
        disabled={me.banned}
        onClick={() => {
          setDraft(me.name)
          setEditing(true)
        }}
        className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm transition hover:border-primary/60 disabled:opacity-70"
      >
        {!tag && (
          <span className="size-2 rounded-full bg-primary" aria-hidden />
        )}
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <Nametag
            name={me.name}
            tag={tag}
            font={font}
            className="max-w-48 font-medium"
          />
          <PlayerTitle title={title} className="max-w-48" />
        </span>
        <Pencil className="size-3.5 text-muted-foreground transition group-hover:text-primary" />
        <span className="sr-only">Change display name</span>
      </button>
    )
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!draft.trim() || saving) return
        setSaving(true)
        try {
          onSaved(await setName({ data: { name: draft } }))
          setEditing(false)
        } catch {
          toast.error('Could not save that name. Try again.')
        } finally {
          setSaving(false)
        }
      }}
    >
      <label htmlFor="player-name" className="sr-only">
        Display name
      </label>
      <Input
        id="player-name"
        value={draft}
        maxLength={24}
        autoFocus
        placeholder="Display name"
        onChange={(e) => setDraft(e.target.value)}
        className="h-9 w-44 bg-card"
      />
      <Button type="submit" size="sm" disabled={!draft.trim() || saving}>
        <Check className="size-4" />
        Save
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Cancel"
        onClick={() => setEditing(false)}
      >
        <X className="size-4" />
      </Button>
    </form>
  )
}
