/**
 * Script to index internal corpus (DogWeekSummary and DogWeekText)
 * 
 * Usage: npm run index-rag:internal [dogId] [days]
 */

import 'dotenv/config';
import { indexInternalCorpus } from '../src/lib/rag/internalIndex';
import { prisma } from '../src/lib/weeklySummary/weeklySummary';

async function main() {
  const args = process.argv.slice(2);
  const dogId = args[0] ? parseInt(args[0]) : null;
  const days = args[1] ? parseInt(args[1]) : 30;

  console.log('🚀 Indexing internal RAG corpus...\n');

  try {
    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    if (dogId) {
      // Index specific dog
      console.log(`📊 Indexing dog ID: ${dogId}`);
      console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

      const result = await indexInternalCorpus({
        dogId,
        startDate,
        endDate,
      });

      console.log(`✅ Indexing complete!`);
      console.log(`   Weeks indexed: ${result.weeksIndexed}`);
      console.log(`   Total chunks: ${result.totalChunks}`);
    } else {
      // Index all dogs
      const dogs = await prisma.dogProfile.findMany({
        select: { id: true, dogName: true },
      });

      if (dogs.length === 0) {
        console.error('❌ No dogs found in database');
        process.exit(1);
      }

      console.log(`📊 Found ${dogs.length} dog(s)\n`);

      let totalChunks = 0;
      let totalWeeks = 0;

      for (const dog of dogs) {
        console.log(`🐕 Indexing ${dog.dogName} (ID: ${dog.id})...`);
        const result = await indexInternalCorpus({
          dogId: dog.id,
          startDate,
          endDate,
        });
        totalChunks += result.totalChunks;
        totalWeeks += result.weeksIndexed;
        console.log(`   ✓ ${result.weeksIndexed} weeks, ${result.totalChunks} chunks\n`);
      }

      console.log(`✅ Indexing complete!`);
      console.log(`   Total weeks indexed: ${totalWeeks}`);
      console.log(`   Total chunks: ${totalChunks}`);
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

