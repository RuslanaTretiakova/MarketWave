# Chat System

> **Source of truth for business rules.** Implementation lives in [`lib/chat/`](../lib/chat/), [`components/chat/`](../components/chat/), and [`supabase/migrations/`](../supabase/migrations/) — migrations always win on schema detail.

---

## Room Types

| Channel / Kind | `channel`  | `kind`  | `system_managed` | Created by                                                                  |
| -------------- | ---------- | ------- | ---------------- | --------------------------------------------------------------------------- |
| Order          | `standard` | `order` | `false`          | User clicks "Start Chat" on Order detail page                               |
| Support        | `support`  | `group` | `true`           | Auto on first-login password setup (client only)                            |
| Sales          | `sales`    | `group` | `true`           | Auto on first-login password setup (client only, requires assigned manager) |
| Standard       | `standard` | `group` | `false`          | Any authenticated user via New Chat dialog                                  |

`system_managed = true` means the room was created by the application on behalf of the user and its metadata (title, participants) is not user-editable.

---

## Participant Rules

### Order rooms

- Client (`orders.user_id`)
- Copywriter (`orders.copywriter_id`) — added at room creation if assigned; added automatically by DB trigger when later assigned
- All admins — auto-added at creation; new admins are auto-added to all existing order rooms by a DB trigger
- Client's assigned manager (`profiles.account_manager_id`) — added at creation if set; **not** all managers

### Support rooms

- Client
- All admins at time of creation (`system_managed = true`)
- Managers are **not** included

### Sales rooms

- Client
- Client's assigned manager (`profiles.account_manager_id`) at time of creation
- When `account_manager_id` changes on the client's profile, the old manager is **removed** and the new manager is **added** automatically (DB trigger `on_account_manager_changed`)
- If no manager is assigned, the Sales room is not created

### Standard rooms

- Creator-selected set of participants (minimum 2, must include creator)
- Title and participant list can be edited by any participant

---

## Creation Rules

| Room     | When                                                              | How                                                                  |
| -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Order    | Lazy — when user clicks **"Start Chat"** on the Order detail page | Server Action `createOrderChatRoom`                                  |
| Support  | After client completes first-login password setup                 | `ensureOnboardingChatsForUser` called from `submitSetPasswordAction` |
| Sales    | Same as Support, only if client has an assigned manager           | Same function                                                        |
| Standard | Any time, by any authenticated user                               | Server Action `createStandardGroupChat`                              |

**Manual Support/Sales creation is not allowed** — blocked in the UI (Channel tab removed) and enforced server-side in `createChannelRoom`.

`ensureOnboardingChatsForUser` is idempotent: if rooms already exist for the user they are not re-created (duplicate-key guard).

---

## Archiving Rules

- Only rooms with `channel = 'standard'` and `status = 'active'` can be archived (`canArchiveChat` in [`lib/chat/chat-rules.ts`](../lib/chat/chat-rules.ts))
- **Support and Sales rooms cannot be archived** — the channel guard blocks it regardless of `system_managed`
- **Order rooms are auto-archived** by DB trigger `archive_order_chat_on_terminal` when the order status reaches `completed` or `canceled`
- Standard rooms can be unarchived (`canUnarchiveChat`: `channel = 'standard'` + `status = 'archived'`)
- Archived rooms are read-only — messaging is disabled

---

## Read Tracking

- **Room-level:** `chat_room_reads.last_read_at` per `(room_id, user_id)` — one row per user per room
- A room is marked read when the user **opens it** (`markRoomRead` called on `ChatShell` mount and on window focus)
- **Unread count** = messages from other users with `created_at > last_read_at`
- **Per-message read receipts** (`chat_message_reads`) exist only for messages you sent — they show you who has read each of your messages

---

## DB Entities

### `chat_rooms`

| Column                      | Type                | Notes                                                   |
| --------------------------- | ------------------- | ------------------------------------------------------- |
| `id`                        | uuid PK             |                                                         |
| `kind`                      | `chat_room_kind`    | `order` \| `direct` \| `group`                          |
| `channel`                   | `chat_channel_type` | `support` \| `sales` \| `standard`                      |
| `status`                    | `chat_room_status`  | `active` \| `archived`                                  |
| `system_managed`            | boolean             | `true` for Support/Sales onboarding rooms               |
| `order_id`                  | uuid FK → orders    | Set only for order rooms; unique                        |
| `onboarding_for_user_id`    | uuid FK → profiles  | Set for Support/Sales rooms; unique per (user, channel) |
| `title`                     | text                | Display name; nullable                                  |
| `created_by`                | uuid FK → profiles  | `null` for system-created rooms                         |
| `created_at` / `updated_at` | timestamptz         | `updated_at` bumped on each new message                 |

### `chat_room_participants`

| Column    | Type                 | Notes |
| --------- | -------------------- | ----- |
| `room_id` | uuid FK → chat_rooms |       |
| `user_id` | uuid FK → profiles   |       |
| PK        | `(room_id, user_id)` |       |

### `chat_messages`

| Column         | Type                 | Notes                                                            |
| -------------- | -------------------- | ---------------------------------------------------------------- |
| `id`           | uuid PK              |                                                                  |
| `room_id`      | uuid FK → chat_rooms |                                                                  |
| `sender_id`    | uuid FK → profiles   | `null` for system messages                                       |
| `body`         | text                 | Max 4 000 chars; `(attachment)` placeholder when attachment-only |
| `message_type` | `chat_message_type`  | `text` \| `system`                                               |
| `created_at`   | timestamptz          |                                                                  |

### `chat_message_attachments`

| Column         | Type                    | Notes                                     |
| -------------- | ----------------------- | ----------------------------------------- |
| `id`           | uuid PK                 |                                           |
| `message_id`   | uuid FK → chat_messages |                                           |
| `storage_path` | text                    | Path in `chat-attachments` Storage bucket |
| `file_name`    | text                    | Original filename                         |
| `mime_type`    | text                    | nullable                                  |
| `size_bytes`   | bigint                  | nullable; max 10 MB enforced client-side  |

### `chat_room_reads`

| Column         | Type                 | Notes                |
| -------------- | -------------------- | -------------------- |
| `room_id`      | uuid                 |                      |
| `user_id`      | uuid                 |                      |
| `last_read_at` | timestamptz          | Updated on room open |
| PK             | `(room_id, user_id)` |                      |

### `chat_message_reads`

| Column       | Type                    | Notes                                                 |
| ------------ | ----------------------- | ----------------------------------------------------- |
| `message_id` | uuid FK → chat_messages |                                                       |
| `user_id`    | uuid FK → profiles      |                                                       |
| PK           | `(message_id, user_id)` | Populated when `last_read_at` advances past a message |
