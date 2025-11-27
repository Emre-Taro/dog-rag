/**
 * Script to index external corpus (dog advice .tsx files)
 * 
 * Usage: npm run index-rag:external
 */

import 'dotenv/config';
import { indexExternalCorpus } from '../src/lib/rag/externalIndex';
import { prisma } from '../src/lib/weeklySummary/weeklySummary';

async function main() {
  console.log('🚀 Indexing external RAG corpus...\n');

  try {
    const result = await indexExternalCorpus({});

    console.log(`✅ Indexing complete!`);
    console.log(`   Files indexed: ${result.filesIndexed}`);
    console.log(`   Total chunks: ${result.totalChunks}\n`);

    if (result.results.length > 0) {
      console.log('📄 Results:');
      result.results.forEach(r => {
        if (r.success) {
          console.log(`   ✓ ${r.filePath} (${r.chunksCount} chunks)`);
        } else {
          console.log(`   ✗ ${r.filePath}: ${r.error}`);
        }
      });
    } else {
      console.log('⚠️  No files found.');
      console.log('💡 Make sure you have files in:');
      console.log('   - src/content/dog-advice/ (.tsx, .ts files)');
      console.log('   - src/data/documents/ (.txt, .md, .mdx files)');
    }
  } catch (error) {
    console.error('\n❌ Error during indexing:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

