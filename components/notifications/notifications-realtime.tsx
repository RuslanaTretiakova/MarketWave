'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

const CHAT_ROOM_PREFIX_RE = /^\[room:([0-9a-f-]{36})\]\s*/i

function hrefFor(row: NotificationRow): string | null {
  if (row.event === 'chat_message') {
    const match = row.message?.match(CHAT_ROOM_PREFIX_RE)
    if (match) return `/chats/${match[1]}`
  }
  if (row.site_id) return `/sites/${row.site_id}`
  if (row.order_id) return `/orders/${row.order_id}`
  return null
}

function displayMessage(row: NotificationRow): string {
  if (row.event === 'chat_message' && row.message) {
    return row.message.replace(CHAT_ROOM_PREFIX_RE, '')
  }
  return row.message ?? ''
}

export function NotificationsRealtime({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on<NotificationRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new
          if (!row || !row.id) return

          const href = hrefFor(row)
          toast(row.title, {
            description: displayMessage(row),
            action: href
              ? {
                  label: 'Open',
                  onClick: () => router.push(href),
                }
              : undefined,
          })

          // Refresh the RSC layout so the bell badge re-fetches the unread count.
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, userId, router])

  return null
}
