'use client'

import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Send,
  Underline as UnderlineIcon,
} from 'lucide-react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { saveContentDraft, submitContent } from '@/lib/orders/content-actions'
import type {
  OrderContentDraft,
  OrderContentSubmittedVersion,
} from '@/lib/orders/load-order-content'
import type { OrderChangeRequest, OrderStatus } from '@/lib/orders/load-order-detail'
import { cn } from '@/lib/utils'

const TITLE_MAX = 200
const META_MAX = 320
type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'error'; message: string }

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'border-border bg-background text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active && 'bg-muted ring-ring ring-2'
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const input = window.prompt('URL (leave blank to remove)', previousUrl ?? 'https://')
    if (input === null) return
    if (input === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    let normalized = input.trim()
    if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('mailto:')) {
      normalized = `https://${normalized}`
    }
    try {
      const url = new URL(normalized)
      if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'mailto:') {
        toast.error('Only http(s) or mailto links are allowed.')
        return
      }
    } catch {
      toast.error('Enter a valid URL.')
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="border-border bg-muted/30 p-inset gap-inset flex flex-wrap rounded-md border">
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive('strike')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <UnderlineIcon className="size-4" />
      </ToolbarButton>
      <span className="bg-border mx-inset h-6 w-px" aria-hidden />
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </ToolbarButton>
      <span className="bg-border mx-inset h-6 w-px" aria-hidden />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive('blockquote')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <span className="bg-border mx-inset h-6 w-px" aria-hidden />
      <ToolbarButton
        label="Insert link"
        active={editor.isActive('link')}
        disabled={disabled}
        onClick={setLink}
      >
        <LinkIcon className="size-4" />
      </ToolbarButton>
    </div>
  )
}

function formatRelative(timestamp: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  return new Date(timestamp).toLocaleTimeString()
}

function describeSaveState(state: SaveState, hasUnsaved: boolean): React.ReactNode {
  if (state.kind === 'saving') return <span className="text-muted-foreground">Saving…</span>
  if (state.kind === 'error')
    return <span className="text-destructive">Could not save: {state.message}</span>
  if (hasUnsaved && state.kind === 'idle')
    return <span className="text-muted-foreground">Unsaved changes</span>
  if (state.kind === 'saved')
    return <span className="text-muted-foreground">Saved {formatRelative(state.at)}</span>
  return <span className="text-muted-foreground">No draft yet</span>
}

export function CopywriterContentEditor({
  orderId,
  status,
  initialDraft,
  latestSubmitted,
  openChangeRequests,
}: {
  orderId: string
  status: OrderStatus
  initialDraft: OrderContentDraft | null
  latestSubmitted?: OrderContentSubmittedVersion | null
  openChangeRequests?: OrderChangeRequest[]
}) {
  const seedDraft =
    initialDraft ??
    (status === 'needs_changes' && latestSubmitted
      ? {
          title: latestSubmitted.title,
          meta_description: latestSubmitted.meta_description,
          body_html: latestSubmitted.body_html,
          word_count: latestSubmitted.word_count,
          updated_at: latestSubmitted.created_at,
        }
      : null)

  const [title, setTitle] = useState(seedDraft?.title ?? '')
  const [meta, setMeta] = useState(seedDraft?.meta_description ?? '')
  const [bodyHtml, setBodyHtml] = useState(seedDraft?.body_html ?? '')
  const [saveState, setSaveState] = useState<SaveState>(
    initialDraft
      ? { kind: 'saved', at: new Date(initialDraft.updated_at).getTime() }
      : { kind: 'idle' }
  )
  const [savingTransition, startSavingTransition] = useTransition()
  const [submittingTransition, startSubmittingTransition] = useTransition()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
    ],
    content: seedDraft?.body_html ?? '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'article-content min-h-64 px-3 py-2 focus:outline-none',
      },
    },
    onUpdate({ editor }) {
      setBodyHtml(editor.getHTML())
    },
  })

  const [lastSaved, setLastSaved] = useState<{ title: string; meta: string; body: string } | null>(
    initialDraft
      ? {
          title: initialDraft.title,
          meta: initialDraft.meta_description,
          body: initialDraft.body_html,
        }
      : null
  )

  const hasUnsaved =
    !lastSaved ||
    lastSaved.title !== title ||
    lastSaved.meta !== meta ||
    lastSaved.body !== bodyHtml

  const performSave = useCallback(
    (showToast: boolean) => {
      const snapshot = { title, meta, body: bodyHtml }
      setSaveState({ kind: 'saving' })
      startSavingTransition(async () => {
        const res = await saveContentDraft(orderId, {
          title: snapshot.title,
          metaDescription: snapshot.meta,
          bodyHtml: snapshot.body,
        })
        if (res.ok) {
          setLastSaved(snapshot)
          setSaveState({ kind: 'saved', at: Date.now() })
          if (showToast) toast.success('Draft saved.')
        } else {
          setSaveState({ kind: 'error', message: res.message })
          if (showToast) toast.error(res.message)
        }
      })
    },
    [orderId, title, meta, bodyHtml]
  )

  function handleManualSave() {
    if (savingTransition || submittingTransition) return
    performSave(true)
  }

  function handleSubmit() {
    if (submittingTransition) return
    if (!title.trim()) {
      toast.error('Add a title before submitting.')
      return
    }
    if (!editor || editor.isEmpty) {
      toast.error('Add some body content before submitting.')
      return
    }

    const submitFlow = () => {
      startSubmittingTransition(async () => {
        const res = await submitContent(orderId)
        if (res.ok) {
          toast.success('Content submitted for review.')
        } else {
          toast.error(res.message)
        }
      })
    }

    if (hasUnsaved) {
      // Save first so the snapshot picks up the latest typed content.
      const snapshot = { title, meta, body: bodyHtml }
      setSaveState({ kind: 'saving' })
      startSavingTransition(async () => {
        const res = await saveContentDraft(orderId, {
          title: snapshot.title,
          metaDescription: snapshot.meta,
          bodyHtml: snapshot.body,
        })
        if (!res.ok) {
          setSaveState({ kind: 'error', message: res.message })
          toast.error(res.message)
          return
        }
        setLastSaved(snapshot)
        setSaveState({ kind: 'saved', at: Date.now() })
        submitFlow()
      })
    } else {
      submitFlow()
    }
  }

  const submitDisabled =
    submittingTransition || savingTransition || !title.trim() || !editor || editor.isEmpty

  const submitLabel = status === 'needs_changes' ? 'Re-submit for review' : 'Submit for review'

  const visibleChangeRequests = openChangeRequests?.filter((cr) => cr.status === 'open') ?? []

  return (
    <div className="space-y-block">
      {visibleChangeRequests.length > 0 && (
        <div className="space-y-inset rounded-lg border border-orange-300/60 bg-orange-50/60 p-3 dark:border-orange-700/40 dark:bg-orange-950/20">
          <p className="text-foreground text-sm font-medium">Changes requested</p>
          {visibleChangeRequests.map((cr) => (
            <div key={cr.id} className="mt-1.5">
              <p className="text-foreground text-sm leading-relaxed">{cr.comment}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {new Date(cr.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-inset">
        <label className="text-foreground block text-sm font-medium" htmlFor="cw-title">
          Title
        </label>
        <Input
          id="cw-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          maxLength={TITLE_MAX}
        />
        <p className="text-muted-foreground text-right text-xs tabular-nums">
          {title.length} / {TITLE_MAX}
        </p>
      </div>

      <div className="space-y-inset">
        <label className="text-foreground block text-sm font-medium" htmlFor="cw-meta">
          Meta description
        </label>
        <Textarea
          id="cw-meta"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          placeholder="Short SEO description (50–320 characters)."
          rows={3}
          maxLength={META_MAX}
        />
        <p className="text-muted-foreground text-right text-xs tabular-nums">
          {meta.length} / {META_MAX}
        </p>
      </div>

      <div className="space-y-inset">
        <label className="text-foreground block text-sm font-medium">Body</label>
        <Toolbar editor={editor} disabled={savingTransition || submittingTransition} />
        <div className="border-border focus-within:border-ring focus-within:ring-ring/40 rounded-lg border focus-within:ring-2">
          <EditorContent editor={editor} />
        </div>
        {editor && (
          <p className="text-muted-foreground text-right text-xs tabular-nums">
            {editor.getText().split(/\s+/).filter(Boolean).length} words
          </p>
        )}
      </div>

      <div className="border-border pt-block gap-block flex flex-col-reverse items-stretch border-t sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs">{describeSaveState(saveState, hasUnsaved)}</p>
        <div className="gap-inset flex flex-wrap justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleManualSave}
            disabled={savingTransition || submittingTransition || !hasUnsaved}
          >
            Save draft
          </Button>
          <Button type="button" variant="cta" onClick={handleSubmit} disabled={submitDisabled}>
            <Send className="size-4" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
