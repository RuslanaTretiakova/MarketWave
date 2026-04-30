# Database Structure

## Overview

- **Type**: PostgreSQL (via Supabase)
- **Location**: `https://eygxneombxwczuvzrzyu.supabase.co`
- **Access**: Through Supabase client or direct SQL

## Tables

### users

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**

- `id` - UUID, primary key, auto-generated
- `email` - Unique email address (required)
- `name` - User's full name
- `status` - 'active' or 'inactive' (default: 'active')
- `avatar_url` - Profile picture URL
- `created_at` - Creation timestamp (auto)
- `updated_at` - Last modification timestamp (auto-updated)

**Relationships:**

- Can be extended with profiles, posts, etc.

**Indexes:**

- `idx_users_email` - Email lookup optimization

**Triggers:**

- `update_users_updated_at` - Auto-updates `updated_at` on every modification

**Row Level Security (RLS):**

- ✅ Enabled
- Policy: Users can read all profiles
- Policy: Users can update only their own profile

---

## Authentication Tables (Managed by Supabase)

- `auth.users` - User accounts
- `auth.sessions` - Active sessions
- `public.profiles` - User profiles (if applicable)

---

## Development Notes

- Use migrations for schema changes
- Always test migrations locally first
- Document breaking schema changes
- Keep audit timestamps on important tables

---

### Update this file when:

- Creating new tables
- Adding/removing columns
- Changing constraints or relationships
- Creating indexes or triggers
