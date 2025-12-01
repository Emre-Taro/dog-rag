/**
 * Script to fix vector index for chunks table
 * Removes btree index and creates HNSW index for vector similarity search
 * 
 * Usage: npm run fix-vector-index
 */

import 'dotenv/config';
import { getDbPool } from '../src/lib/db';
import { getEmbeddingDimension } from '../src/lib/rag/embedding';

async function main() {
  console.log('🔧 Fixing vector index for chunks table...\n');

  const pool = getDbPool();
  const dimension = getEmbeddingDimension();

  try {
    // Check if pgvector extension exists
    const extCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      )
    `);

    if (!extCheck.rows[0]?.exists) {
      console.log('📦 Creating pgvector extension...');
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('✅ pgvector extension created\n');
    } else {
      console.log('✅ pgvector extension already exists\n');
    }

    // Drop existing btree index if it exists
    console.log('🗑️  Dropping existing btree index (if exists)...');
    try {
      await pool.query('DROP INDEX IF EXISTS idx_chunks_embedding');
      console.log('✅ Btree index dropped\n');
    } catch (error) {
      console.log('⚠️  Error dropping index (may not exist):', error instanceof Error ? error.message : String(error));
    }

    // Check if embedding column has dimensions
    const columnInfo = await pool.query(`
      SELECT 
        attname,
        atttypmod
      FROM pg_attribute
      WHERE attrelid = 'chunks'::regclass
      AND attname = 'embedding'
    `);

    const hasDimensions = columnInfo.rows.length > 0 && columnInfo.rows[0].atttypmod !== -1;

    if (!hasDimensions) {
      console.log(`📝 Embedding column doesn't have dimensions. Setting to vector(${dimension})...`);
      
      // Check if there's any data
      const countResult = await pool.query('SELECT COUNT(*) as count FROM chunks');
      const count = parseInt(countResult.rows[0].count);
      
      if (count > 0) {
        console.log(`⚠️  Warning: ${count} rows exist. Dropping and recreating column...`);
        await pool.query('ALTER TABLE chunks DROP COLUMN embedding');
        await pool.query(`ALTER TABLE chunks ADD COLUMN embedding vector(${dimension})`);
      } else {
        // No data, safe to alter
        await pool.query(`ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(${dimension})`);
      }
      console.log('✅ Embedding column updated with dimensions\n');
    } else {
      console.log('✅ Embedding column already has dimensions\n');
    }

    // Create HNSW index for vector similarity search
    console.log(`📊 Creating HNSW index for vector(${dimension})...`);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
      ON chunks 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    console.log('✅ HNSW index created\n');

    console.log('✅ Vector index fix complete!');
  } catch (error) {
    console.error('\n❌ Error fixing vector index:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

