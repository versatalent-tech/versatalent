import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
  try {
    console.log('🔄 Running migration 014: Add talent cover_image field...');

    // Add cover_image column
    await sql`ALTER TABLE talents ADD COLUMN IF NOT EXISTS cover_image TEXT`;

    console.log('✅ Migration 014 completed successfully!');
    console.log('📝 Added cover_image column to talents table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
