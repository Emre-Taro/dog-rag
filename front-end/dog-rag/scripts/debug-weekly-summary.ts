/**
 * Debug script to check weekly summary data
 */

import 'dotenv/config';
import { prisma } from '../src/lib/weeklySummary/weeklySummary';

async function main() {
  const dogId = 1;
  const days = 30;

  console.log(`🔍 Checking weekly summary data for dog ID: ${dogId}\n`);

  // Calculate date range
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

  try {
    // Check all summaries for this dog
    const allSummaries = await prisma.dogWeekSummary.findMany({
      where: { dogId },
      orderBy: { weekStart: 'desc' },
    });

    console.log(`📊 Total summaries for dog ${dogId}: ${allSummaries.length}\n`);

    if (allSummaries.length > 0) {
      console.log('Recent summaries:');
      allSummaries.slice(0, 5).forEach((s, idx) => {
        const weekStart = s.weekStart.toISOString().split('T')[0];
        const weekEnd = s.weekEnd.toISOString().split('T')[0];
        const inRange = s.weekStart <= endDate && s.weekEnd >= startDate;
        console.log(`\n${idx + 1}. Week: ${weekStart} ~ ${weekEnd} ${inRange ? '✅ IN RANGE' : '❌ OUT OF RANGE'}`);
        console.log(`   Has summaryText: ${s.summaryText ? `Yes (${s.summaryText.length} chars)` : 'No'}`);
        console.log(`   Has summaryJson: ${s.summaryJson ? 'Yes' : 'No'}`);
      });

      // Check with overlap query
      const overlappingSummaries = await prisma.dogWeekSummary.findMany({
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
        orderBy: {
          weekStart: 'asc',
        },
      });

      console.log(`\n📈 Overlapping summaries (weekStart <= endDate AND weekEnd >= startDate): ${overlappingSummaries.length}`);
    } else {
      console.log('⚠️  No weekly summaries found for this dog.');
      console.log('💡 You need to generate weekly summaries first by calling /api/weekly-summary');
    }

    // Check week texts
    const weekTexts = await prisma.dogWeekText.findMany({
      where: { dogId },
      take: 5,
      orderBy: { eventAt: 'desc' },
    });

    console.log(`\n📄 Recent week texts: ${weekTexts.length} (showing first 5)`);
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

