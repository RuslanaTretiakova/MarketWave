'use client'

import { Paperclip, Send, X } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { createAttachmentUploadUrl, sendMessage } from '@/lib/chat/chat-actions'
import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const CHAT_BUCKET = 'chat-attachments'

type StagedFile = {
  file: File
  /** When set, the upload has finished and we know the final storage path. */
  storagePath?: string
  uploading: boolean
  error?: string
}

export function MessageComposer({ roomId }: { roomId: string }) {
  const [body, setBody] = useState('')
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handlePickFile() {
    fileInputRef.current?.click()
  }

  async function uploadStaged(file: File): Promise<string | null> {
    const res = await createAttachmentUploadUrl(roomId, file.name)
    if (!res.ok) {
      toast.error(res.message)
      return null
    }
    const supabase = createClient()
    const upload = await supabase.storage
      .from(CHAT_BUCKET)
      .uploadToSignedUrl(res.path, res.token, file, { contentType: file.type })
    if (upload.error) {
      toast.error(upload.error.message)
      return null
    }
    return res.path
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const newOnes: StagedFile[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: file too large (max 10 MB).`)
        continue
      }
      newOnes.push({ file, uploading: true })
    }
    if (newOnes.length === 0) return
    setStaged((prev) => [...prev, ...newOnes])

    for (const item of newOnes) {
      const path = await uploadStaged(item.file)
      setStaged((prev) =>
        prev.map((s) =>
          s.file === item.file
            ? {
                ...s,
                uploading: false,
                storagePath: path ?? undefined,
                error: path ? undefined : 'Upload failed',
              }
            : s
        )
      )
    }
  }

  function removeStaged(file: File) {
    setStaged((prev) => prev.filter((s) => s.file !== file))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = body.trim()
    const attachments = staged.filter((s) => !!s.storagePath && !s.error)

    if (!trimmed && attachments.length === 0) return
    if (staged.some((s) => s.uploading)) {
      toast.message('Wait for uploads to finish.')
      return
    }

    startTransition(async () => {
      const res = await sendMessage({
        roomId,
        body: trimmed,
        attachments: attachments.map((s) => ({
          storagePath: s.storagePath!,
          fileName: s.file.name,
          mimeType: s.file.type || undefined,
          sizeBytes: s.file.size,
        })),
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setBody('')
      setStaged([])
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-background p-block gap-inset flex flex-col border-t"
    >
      {staged.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {staged.map((s) => (
            <li
              key={s.file.name + s.file.size}
              className="border-border bg-muted/40 gap-inset inline-flex items-center rounded-md border px-2 py-1 text-xs"
            >
              <Paperclip className="size-3 shrink-0" />
              <span className="max-w-40 truncate">{s.file.name}</span>
              {s.uploading && <span className="text-muted-foreground">Uploading…</span>}
              {s.error && <span className="text-destructive">{s.error}</span>}
              <button
                type="button"
                onClick={() => removeStaged(s.file)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${s.file.name}`}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="gap-inset flex items-end">
        <button
          type="button"
          onClick={handlePickFile}
          className="border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md border"
          aria-label="Attach files"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.currentTarget.value = ''
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              const form = (e.currentTarget as HTMLTextAreaElement).form
              form?.requestSubmit()
            }
          }}
          placeholder="Type a message…"
          rows={1}
          maxLength={4000}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground min-h-9 flex-1 resize-none rounded-md border px-3 py-2 text-sm"
        />
        <Button type="submit" variant="cta" size="default" disabled={pending}>
          <Send className="size-4" />
          Send
        </Button>
      </div>
    </form>
  )
}
