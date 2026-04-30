// Re-export from generated types.
// Once database.types.ts is unlocked, rename database.types.new.ts → database.types.ts
// and update this import back to './database.types'.
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './database.types.new'
export { Constants } from './database.types.new'
