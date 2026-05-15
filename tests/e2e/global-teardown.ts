// Cleanup is optional during development — uncomment to delete E2E users after each run.
// In CI, the local Supabase DB is ephemeral so cleanup is not needed.

// import { cleanupTestUsers } from './helpers/supabase'

export default async function globalTeardown() {
  // await cleanupTestUsers()
}
