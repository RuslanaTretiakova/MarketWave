'use client'

import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/react'
import { useMemo, useState } from 'react'

import type { OrderContentSubmittedVersion } from '@/lib/orders/load-order-content'

function ReadOnlyContent({ html }: { html: string }) {
  const editor = useEditor(
    {
      editable: false,
      immediatelyRender: false,
      content: html || '<p></p>',
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
        Link.configure({
          openOnClick: true,
          autolink: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        }),
      ],
      editorProps: {
        attributes: { class: 'article-content focus:outline-none' },
      },
    },
    [html]
  )

  return <EditorContent editor={editor} />
}

export function OrderContentViewer({ versions }: { versions: OrderContentSubmittedVersion[] }) {
  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.version_number - a.version_number),
    [versions]
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">
        Copywriter has not submitted content yet.
      </p>
    )
  }

  // Fall back to the latest if the chosen id is no longer present (e.g. version
  // list shrunk between renders); avoids needing a setState-in-effect.
  const active = sorted.find((v) => v.id === selectedId) ?? sorted[0]
  const isLatest = active.id === sorted[0].id

  return (
    <div className="space-y-block">
      <div className="gap-block flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-inset">
          <h4 className="text-foreground text-lg font-semibold">{active.title || 'Untitled'}</h4>
          {active.meta_description && (
            <p className="text-muted-foreground text-sm">{active.meta_description}</p>
          )}
        </div>
        <div className="gap-inset flex flex-wrap items-center text-xs">
          <span
            className={
              isLatest
                ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 font-medium'
            }
          >
            Version {active.version_number}
            {isLatest ? ' · current' : ''}
          </span>
          <span className="text-muted-foreground">
            Submitted {new Date(active.created_at).toLocaleString()}
          </span>
          <span className="text-muted-foreground">{active.word_count} words</span>
        </div>
      </div>

      {sorted.length > 1 && (
        <div className="gap-inset flex flex-wrap items-center">
          <span className="text-muted-foreground text-xs font-medium">History:</span>
          {sorted.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={
                v.id === active.id
                  ? 'border-primary bg-primary/10 text-primary inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium'
              }
            >
              v{v.version_number}
            </button>
          ))}
        </div>
      )}

      <div className="border-border p-section bg-muted/10 rounded-lg border">
        <ReadOnlyContent html={active.body_html} />
      </div>
    </div>
  )
}
