import { getPgPool } from './pool.js';

const DDL = `
CREATE TABLE IF NOT EXISTS cm_documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  doc JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_cm_documents_collection ON cm_documents (collection);
CREATE INDEX IF NOT EXISTS idx_cm_users_phone ON cm_documents ((doc->>'phone')) WHERE collection = 'users';
CREATE INDEX IF NOT EXISTS idx_cm_smscodes_phone ON cm_documents ((doc->>'phone')) WHERE collection = 'smscodes';
CREATE INDEX IF NOT EXISTS idx_cm_requirements_author ON cm_documents ((doc->>'author')) WHERE collection = 'requirements';
CREATE INDEX IF NOT EXISTS idx_cm_conversations_user ON cm_documents ((doc->>'userId')) WHERE collection = 'conversations';
`;

export async function migratePostgres(): Promise<void> {
  const pool = getPgPool();
  await pool.query(DDL);
}
