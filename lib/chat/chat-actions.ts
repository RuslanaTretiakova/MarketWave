'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

const CHAT_BUCKET = 'chat-attachments'
const MAX_BODY = 4000
const SIGNED_UPLOAD_TTL_SECONDS = 60 * 5

async function requireSession(): Promise<
  { ok: true; userId: string; role: UserRole } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, message: 'You must be signed in.' }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) return { ok: false, message: 'Profile not found.' }
  return { ok: true, userId: user.id, role: profile.role }
}

async function isParticipant(roomId: string, userId: string): Promise<boolean> {
  const { data } = await adminClient
    .from('chat_room_participants')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

export type SendMessageInput = {
  roomId: string
  body: string
  attachments?: { storagePath: string; fileName: string; mimeType?: string; sizeBytes?: number }[]
}

export async function sendMessage(
  input: SendMessageInput
): Promise<{ ok: true; messageId: string } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const body = input.body.trim()
  if (!body && (input.attachments ?? []).length === 0) {
    return { ok: false, message: 'Message body or an attachment is required.' }
  }
  if (body.length > MAX_BODY) {
    return { ok: false, message: `Message must be ${MAX_BODY} characters or fewer.` }
  }

  const ok = await isParticipant(input.roomId, auth.userId)
  if (!ok && auth.role !== 'admin') {
    return { ok: false, message: 'You are not a participant of this room.' }
  }

  const { data: inserted, error } = await adminClient
    .from('chat_messages')
    .insert({
      room_id: input.roomId,
      sender_id: auth.userId,
      body: body || '(attachment)',
      message_type: 'text',
    })
    .select('id')
    .maybeSingle()

  if (error || !inserted) {
    return { ok: false, message: error?.message ?? 'Could not send message.' }
  }

  if (input.attachments && input.attachments.length > 0) {
    const rows = input.attachments.map((att) => ({
      message_id: inserted.id,
      storage_path: att.storagePath,
      file_name: att.fileName,
      mime_type: att.mimeType ?? null,
      size_bytes: att.sizeBytes ?? null,
    }))
    const { error: attErr } = await adminClient.from('chat_message_attachments').insert(rows)
    if (attErr) {
      console.error('[chat/send] attachments insert', attErr.message)
    }
  }

  // Bump room updated_at for fast room-list ordering.
  await adminClient
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.roomId)

  revalidatePath('/chats')
  revalidatePath(`/chats/${input.roomId}`)
  return { ok: true, messageId: inserted.id }
}

export async function markRoomRead(
  roomId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const ok = await isParticipant(roomId, auth.userId)
  if (!ok && auth.role !== 'admin') {
    return { ok: false, message: 'You are not a participant of this room.' }
  }

  const nowIso = new Date().toISOString()
  const { error } = await adminClient
    .from('chat_room_reads')
    .upsert(
      { room_id: roomId, user_id: auth.userId, last_read_at: nowIso },
      { onConflict: 'room_id,user_id' }
    )

  if (error) return { ok: false, message: error.message ?? 'Could not mark room as read.' }
  return { ok: true }
}

export async function addParticipant(
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can add participants.' }
  }

  const { error } = await adminClient
    .from('chat_room_participants')
    .insert({ room_id: roomId, user_id: userId })

  if (error && !error.message.includes('duplicate')) {
    return { ok: false, message: error.message ?? 'Could not add participant.' }
  }

  revalidatePath(`/chats/${roomId}`)
  return { ok: true }
}

/**
 * Generates a signed upload URL that the browser can PUT a file to. Returns the
 * `path` you must include in subsequent `sendMessage({ attachments: [...] })`.
 */
export async function createAttachmentUploadUrl(
  roomId: string,
  fileName: string
): Promise<
  { ok: true; path: string; uploadUrl: string; token: string } | { ok: false; message: string }
> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const ok = await isParticipant(roomId, auth.userId)
  if (!ok && auth.role !== 'admin') {
    return { ok: false, message: 'You are not a participant of this room.' }
  }

  const safeName = fileName.replace(/[^\w.\-]/g, '_').slice(0, 120) || 'file'
  const path = `${roomId}/${crypto.randomUUID()}-${safeName}`

  const { data, error } = await adminClient.storage
    .from(CHAT_BUCKET)
    .createSignedUploadUrl(path, { upsert: false })

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create upload URL.' }
  }

  return {
    ok: true,
    path: data.path,
    uploadUrl: data.signedUrl,
    token: data.token,
  }
}

/** Generates a short-lived download URL for an existing attachment object. */
export async function getAttachmentDownloadUrl(
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  // The first path segment is the room id; verify membership before signing.
  const roomId = storagePath.split('/')[0]
  const ok = await isParticipant(roomId, auth.userId)
  if (!ok && auth.role !== 'admin') {
    return { ok: false, message: 'You do not have access to this file.' }
  }

  const { data, error } = await adminClient.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_UPLOAD_TTL_SECONDS)

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create download URL.' }
  }
  return { ok: true, url: data.signedUrl }
}
