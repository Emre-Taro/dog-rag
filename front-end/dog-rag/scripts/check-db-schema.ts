/**
 * Script to check database schema for chunks table
 */

import 'dotenv/config';
import { getDbPool } from '../src/lib/db';

async function main() {
  const pool = getDbPool();

  try {
    // Check chunks table structure
    const tableInfo = await pool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'chunks'
      ORDER BY ordinal_position
    `);

    console.log('📊 Chunks table columns:');
    tableInfo.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.udt_name})`);
    });

    // Check if embedding column has dimensions
    const embeddingInfo = await pool.query(`
      SELECT 
        attname,
        atttypid::regtype,
        atttypmod
      FROM pg_attribute
      WHERE attrelid = 'chunks'::regclass
      AND attname = 'embedding'
    `);

    console.log('\n📊 Embedding column details:');
    if (embeddingInfo.rows.length > 0) {
      const row = embeddingInfo.rows[0];
      console.log(`   Name: ${row.attname}`);
      console.log(`   Type: ${row.atttypid}`);
      console.log(`   Mod: ${row.atttypmod}`);
    } else {
      console.log('   Column not found');
    }

    // Check existing indexes
    const indexes = await pool.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'chunks'
    `);

    console.log('\n📊 Existing indexes on chunks table:');
    indexes.rows.forEach(row => {
      console.log(`   ${row.indexname}:`);
      console.log(`      ${row.indexdef}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

