'use server'

import { revalidatePath } from 'next/cache'

import {
  canArchiveChat,
  canEditChatMetadata,
  canSendMessages,
  canUnarchiveChat,
} from '@/lib/chat/chat-rules'
import { adminClient } from '@/lib/supabase/admin'
import { findOrderRoomId } from '@/lib/chat/find-room'
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

type RoomMeta = {
  id: string
  kind: Database['public']['Enums']['chat_room_kind']
  channel: Database['public']['Enums']['chat_channel_type']
  status: Database['public']['Enums']['chat_room_status']
  system_managed: boolean
  title: string | null
  order_id: string | null
}

async function loadRoomMeta(roomId: string): Promise<RoomMeta | null> {
  const { data } = await adminClient
    .from('chat_rooms')
    .select('id, kind, channel, status, system_managed, title, order_id')
    .eq('id', roomId)
    .maybeSingle()
  if (!data) return null
  return data as RoomMeta
}

function defaultChannelTitle(channel: Database['public']['Enums']['chat_channel_type']): string {
  const d = new Date()
  const day = d.toISOString().slice(0, 10)
  if (channel === 'support') return `Support · ${day}`
  if (channel === 'sales') return `Sales · ${day}`
  return `Chat · ${day}`
}

async function participantDisplayNames(ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map()
  const { data } = await adminClient.from('profiles').select('id, full_name').in('id', ids)
  const m = new Map<string, string | null>()
  for (const row of data ?? []) {
    m.set(row.id, row.full_name)
  }
  return m
}

function titleFromParticipantNames(names: (string | null)[]): string {
  const parts = names
    .map((n) => (n ?? '').trim())
    .filter(Boolean)
    .slice(0, 4)
  if (parts.length === 0) return 'Conversation'
  const extra = names.filter(Boolean).length > 4 ? '…' : ''
  return `${parts.join(', ')}${extra}`
}

async function assertCanMutateStandardRoom(
  auth: { userId: string; role: UserRole },
  meta: RoomMeta,
  opts: { requireActive?: boolean } = {}
): Promise<{ ok: true } | { ok: false; message: string }> {
  const isStaff = auth.role === 'admin' || auth.role === 'manager'
  if (!canEditChatMetadata(meta.channel, auth.role)) {
    return { ok: false, message: 'Action forbidden: only Standard chats can be changed.' }
  }
  if (meta.system_managed && !isStaff) {
    return { ok: false, message: 'Action forbidden: this chat is managed by the system.' }
  }
  if (opts.requireActive && !canSendMessages(meta.status)) {
    return { ok: false, message: 'This chat is archived.' }
  }
  const member = await isParticipant(meta.id, auth.userId)
  if (!member) {
    return { ok: false, message: 'You are not a participant of this room.' }
  }
  return { ok: true }
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

  const meta = await loadRoomMeta(input.roomId)
  if (!meta) return { ok: false, message: 'Chat not found.' }
  if (!canSendMessages(meta.status)) {
    return { ok: false, message: 'Messaging is disabled for archived chats.' }
  }

  const ok = await isParticipant(input.roomId, auth.userId)
  if (!ok) {
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

  await adminClient
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.roomId)

  void fireChatMessageNotifications({
    roomId: input.roomId,
    senderId: auth.userId,
    body,
    meta,
  })

  revalidatePath('/chats')
  revalidatePath(`/chats/${input.roomId}`)
  return { ok: true, messageId: inserted.id }
}

const CHAT_NOTIFY_DEBOUNCE_MS = 5 * 60 * 1000

async function fireChatMessageNotifications(params: {
  roomId: string
  senderId: string
  body: string
  meta: RoomMeta
}): Promise<void> {
  const [{ data: participants }, { data: reads }] = await Promise.all([
    adminClient
      .from('chat_room_participants')
      .select('user_id')
      .eq('room_id', params.roomId)
      .neq('user_id', params.senderId),
    adminClient
      .from('chat_room_reads')
      .select('user_id, last_read_at')
      .eq('room_id', params.roomId),
  ])

  const readByUser = new Map<string, string>()
  for (const r of reads ?? []) readByUser.set(r.user_id, r.last_read_at)

  const cutoff = Date.now() - CHAT_NOTIFY_DEBOUNCE_MS
  const recipientUserIds: string[] = []
  for (const p of participants ?? []) {
    const last = readByUser.get(p.user_id)
    if (!last || new Date(last).getTime() < cutoff) {
      recipientUserIds.push(p.user_id)
    }
  }
}

export async function markRoomRead(
  roomId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const ok = await isParticipant(roomId, auth.userId)
  if (!ok) {
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

  const meta = await loadRoomMeta(roomId)
  if (!meta) return { ok: false, message: 'Chat not found.' }
  if (!canSendMessages(meta.status)) {
    return { ok: false, message: 'This chat is archived.' }
  }

  let allowed = auth.role === 'admin' || auth.role === 'manager'
  if (!allowed) {
    const gate = await assertCanMutateStandardRoom(auth, meta, { requireActive: true })
    allowed = gate.ok
  }
  if (!allowed) {
    return { ok: false, message: 'You cannot add participants to this chat.' }
  }

  const { error } = await adminClient
    .from('chat_room_participants')
    .insert({ room_id: roomId, user_id: userId })

  if (error && !error.message.includes('duplicate')) {
    return { ok: false, message: error.message ?? 'Could not add participant.' }
  }

  revalidatePath(`/chats/${roomId}`)
  revalidatePath('/chats')
  return { ok: true }
}

export async function createChannelRoom(input: {
  channel: Database['public']['Enums']['chat_channel_type']
  title?: string
  participantIds: string[]
}): Promise<{ ok: true; roomId: string } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can create channel rooms.' }
  }
  if (input.channel === 'support' || input.channel === 'sales') {
    return { ok: false, message: 'Support and Sales rooms cannot be created manually.' }
  }
  if (input.channel !== 'standard') {
    return { ok: false, message: 'Invalid channel.' }
  }

  const trimmed = (input.title ?? '').trim()
  const title = trimmed || defaultChannelTitle(input.channel)
  if (title.length > 120)
    return { ok: false, message: 'Room title must be 120 characters or fewer.' }

  const participantIds = [...new Set([auth.userId, ...input.participantIds.filter(Boolean)])]

  const { data: room, error } = await adminClient
    .from('chat_rooms')
    .insert({
      kind: 'group',
      channel: input.channel,
      title,
      created_by: auth.userId,
      system_managed: false,
      status: 'active',
    })
    .select('id')
    .maybeSingle()
  if (error || !room) return { ok: false, message: error?.message ?? 'Could not create room.' }

  const rows = participantIds.map((id) => ({ room_id: room.id, user_id: id }))
  const { error: pErr } = await adminClient.from('chat_room_participants').insert(rows)
  if (pErr) return { ok: false, message: pErr.message ?? 'Could not add participants.' }

  revalidatePath('/chats')
  return { ok: true, roomId: room.id }
}

export async function createStandardGroupChat(input: {
  title?: string
  participantIds: string[]
}): Promise<{ ok: true; roomId: string } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const ids = [...new Set([auth.userId, ...input.participantIds.filter(Boolean)])]
  if (ids.length < 2) {
    return { ok: false, message: 'Select at least one other participant.' }
  }

  let title = (input.title ?? '').trim()
  if (!title) {
    const nameMap = await participantDisplayNames(ids)
    title = titleFromParticipantNames(ids.map((id) => nameMap.get(id) ?? null))
  }
  if (title.length > 120) {
    return { ok: false, message: 'Title must be 120 characters or fewer.' }
  }

  const { data: room, error } = await adminClient
    .from('chat_rooms')
    .insert({
      kind: 'group',
      channel: 'standard',
      title,
      created_by: auth.userId,
      system_managed: false,
      status: 'active',
    })
    .select('id')
    .maybeSingle()

  if (error || !room) return { ok: false, message: error?.message ?? 'Could not create chat.' }

  const rows = ids.map((id) => ({ room_id: room.id, user_id: id }))
  const { error: pErr } = await adminClient.from('chat_room_participants').insert(rows)
  if (pErr) return { ok: false, message: pErr.message ?? 'Could not add participants.' }

  revalidatePath('/chats')
  return { ok: true, roomId: room.id }
}

export async function createOrderChatRoom(
  orderId: string
): Promise<{ ok: true; roomId: string } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const { data: order } = await adminClient
    .from('orders')
    .select('id, user_id, copywriter_id, site_domain')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { ok: false, message: 'Order not found.' }

  const isOwner = order.user_id === auth.userId
  const isStaff = auth.role === 'admin' || auth.role === 'manager'
  if (!isOwner && !isStaff) {
    return { ok: false, message: 'You do not have access to this order.' }
  }

  const existing = await findOrderRoomId(orderId)
  if (existing) return { ok: true, roomId: existing }

  const { data: room, error } = await adminClient
    .from('chat_rooms')
    .insert({
      kind: 'order',
      channel: 'standard',
      order_id: orderId,
      title: order.site_domain,
      system_managed: false,
      status: 'active',
    })
    .select('id')
    .maybeSingle()

  if (error || !room) return { ok: false, message: error?.message ?? 'Could not create chat room.' }

  const participantIds = new Set<string>([order.user_id])
  if (order.copywriter_id) participantIds.add(order.copywriter_id)

  const [adminsResult, clientProfileResult] = await Promise.all([
    adminClient.from('profiles').select('id').eq('role', 'admin'),
    adminClient.from('profiles').select('account_manager_id').eq('id', order.user_id).maybeSingle(),
  ])
  for (const a of adminsResult.data ?? []) participantIds.add(a.id)
  if (clientProfileResult.data?.account_manager_id) {
    participantIds.add(clientProfileResult.data.account_manager_id)
  }

  await adminClient
    .from('chat_room_participants')
    .insert([...participantIds].map((user_id) => ({ room_id: room.id, user_id })))

  revalidatePath('/chats')
  revalidatePath(`/orders/${orderId}`)
  return { ok: true, roomId: room.id }
}

export async function updateChatRoom(input: {
  roomId: string
  title?: string
  participantIds?: string[]
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const meta = await loadRoomMeta(input.roomId)
  if (!meta) return { ok: false, message: 'Chat not found.' }

  const gate = await assertCanMutateStandardRoom(auth, meta, { requireActive: true })
  if (!gate.ok) return gate

  if (input.title !== undefined) {
    const t = input.title.trim()
    if (!t) return { ok: false, message: 'Title cannot be empty.' }
    if (t.length > 120) return { ok: false, message: 'Title must be 120 characters or fewer.' }
    const { error } = await adminClient
      .from('chat_rooms')
      .update({ title: t })
      .eq('id', input.roomId)
    if (error) return { ok: false, message: error.message ?? 'Could not update title.' }
  }

  if (input.participantIds !== undefined) {
    const next = [...new Set(input.participantIds.filter(Boolean))]
    if (!next.includes(auth.userId)) {
      return { ok: false, message: 'You must remain a participant.' }
    }
    if (next.length < 2) {
      return { ok: false, message: 'A chat needs at least two participants.' }
    }

    const { data: current } = await adminClient
      .from('chat_room_participants')
      .select('user_id')
      .eq('room_id', input.roomId)

    const curSet = new Set((current ?? []).map((r) => r.user_id))
    const nextSet = new Set(next)
    const toRemove = [...curSet].filter((id) => !nextSet.has(id))
    const toAdd = [...nextSet].filter((id) => !curSet.has(id))

    if (toRemove.length > 0) {
      const { error: delErr } = await adminClient
        .from('chat_room_participants')
        .delete()
        .eq('room_id', input.roomId)
        .in('user_id', toRemove)
      if (delErr) return { ok: false, message: delErr.message ?? 'Could not update participants.' }
    }
    if (toAdd.length > 0) {
      const { error: insErr } = await adminClient
        .from('chat_room_participants')
        .insert(toAdd.map((user_id) => ({ room_id: input.roomId, user_id })))
      if (insErr) return { ok: false, message: insErr.message ?? 'Could not update participants.' }
    }
  }

  await adminClient
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.roomId)

  revalidatePath('/chats')
  revalidatePath(`/chats/${input.roomId}`)
  return { ok: true }
}

export async function archiveChat(
  roomId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const meta = await loadRoomMeta(roomId)
  if (!meta) return { ok: false, message: 'Chat not found.' }
  if (!canArchiveChat(meta.channel, meta.status)) {
    return { ok: false, message: 'Action forbidden: only active Standard chats can be archived.' }
  }

  const member = await isParticipant(roomId, auth.userId)
  if (!member) {
    return { ok: false, message: 'You are not a participant of this room.' }
  }

  const { error } = await adminClient
    .from('chat_rooms')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', roomId)

  if (error) return { ok: false, message: error.message ?? 'Could not archive chat.' }
  revalidatePath('/chats')
  revalidatePath(`/chats/${roomId}`)
  return { ok: true }
}

export async function unarchiveChat(
  roomId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const meta = await loadRoomMeta(roomId)
  if (!meta) return { ok: false, message: 'Chat not found.' }
  if (!canUnarchiveChat(meta.channel, meta.status)) {
    return { ok: false, message: 'Action forbidden: only archived Standard chats can be restored.' }
  }

  const member = await isParticipant(roomId, auth.userId)
  if (!member) {
    return { ok: false, message: 'You are not a participant of this room.' }
  }

  const { error } = await adminClient
    .from('chat_rooms')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', roomId)

  if (error) return { ok: false, message: error.message ?? 'Could not restore chat.' }
  revalidatePath('/chats')
  revalidatePath(`/chats/${roomId}`)
  return { ok: true }
}

export async function createAttachmentUploadUrl(
  roomId: string,
  fileName: string
): Promise<
  { ok: true; path: string; uploadUrl: string; token: string } | { ok: false; message: string }
> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const meta = await loadRoomMeta(roomId)
  if (!meta) return { ok: false, message: 'Chat not found.' }
  if (!canSendMessages(meta.status)) {
    return { ok: false, message: 'Uploads are disabled for archived chats.' }
  }

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

export async function getAttachmentDownloadUrl(
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const auth = await requireSession()
  if (!auth.ok) return auth

  const roomId = storagePath.split('/')[0]
  const ok = await isParticipant(roomId, auth.userId)
  if (!ok) {
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
