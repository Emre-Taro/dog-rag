/**
 * Script to generate weekly summaries for dogs
 * This calls the buildWeeklyDataForRange function to populate DogWeekSummary table
 * 
 * Usage: tsx scripts/generate-weekly-summaries.ts [dogId] [days]
 */

import 'dotenv/config';
import { buildWeeklyDataForRange } from '../src/lib/weeklySummary/buildWeeklyData';
import { prisma } from '../src/lib/weeklySummary/weeklySummary';

async function main() {
  const args = process.argv.slice(2);
  const dogId = args[0] ? parseInt(args[0]) : null;
  const days = args[1] ? parseInt(args[1]) : 30;

  console.log('🚀 Generating weekly summaries...\n');

  try {
    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    if (dogId) {
      console.log(`📊 Generating for dog ID: ${dogId}`);
      console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

      // Verify dog exists
      const dog = await prisma.dogProfile.findUnique({
        where: { id: dogId },
        select: { id: true, dogName: true },
      });

      if (!dog) {
        console.error(`❌ Dog with ID ${dogId} not found`);
        process.exit(1);
      }

      console.log(`✅ Dog found: ${dog.dogName}\n`);

      // Generate weekly summaries
      const result = await buildWeeklyDataForRange({
        dogId,
        startDate,
        endDate,
      });

      console.log(`✅ Generated ${result.weeks.length} week(s) of data\n`);

      // Verify data was saved
      const savedSummaries = await prisma.dogWeekSummary.findMany({
        where: {
          dogId,
          AND: [
            {
              weekStart: {
                lte: endDate,
              },
            },
            {
              weekEnd: {
                gte: startDate,
              },
            },
          ],
        },
      });

      console.log(`📝 Saved ${savedSummaries.length} summary record(s) to database`);
      savedSummaries.forEach((s, idx) => {
        console.log(`   ${idx + 1}. Week: ${s.weekStart.toISOString().split('T')[0]} ~ ${s.weekEnd.toISOString().split('T')[0]}`);
        console.log(`      Has summaryText: ${s.summaryText ? `Yes (${s.summaryText.length} chars)` : 'No'}`);
      });

      // Check week texts
      const weekTexts = await prisma.dogWeekText.findMany({
        where: {
          dogId,
          weekStart: {
            lte: endDate,
          },
          weekEnd: {
            gte: startDate,
          },
        },
      });
      console.log(`\n📄 Saved ${weekTexts.length} week text entries`);

    } else {
      // Generate for all dogs
      const dogs = await prisma.dogProfile.findMany({
        select: { id: true, dogName: true },
      });

      if (dogs.length === 0) {
        console.error('❌ No dogs found in database');
        process.exit(1);
      }

      console.log(`📊 Found ${dogs.length} dog(s)\n`);

      for (const dog of dogs) {
        console.log(`🐕 Processing ${dog.dogName} (ID: ${dog.id})...`);
        try {
          const result = await buildWeeklyDataForRange({
            dogId: dog.id,
            startDate,
            endDate,
          });
          console.log(`   ✅ Generated ${result.weeks.length} week(s)\n`);
        } catch (error) {
          console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
        }
      }
    }

    console.log('\n✅ Weekly summary generation complete!');
    console.log('💡 Now you can run: npm run index-rag:internal');

  } catch (error) {
    console.error('\n❌ Error during generation:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

