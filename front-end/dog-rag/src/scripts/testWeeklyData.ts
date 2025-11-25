// src/scripts/testWeeklyData.ts
import { buildWeeklyDataForRange } from '../lib/weeklySummary/buildWeeklyData'

async function main() {
  // ① テストしたい犬の ID
  const dogId = 2

  // ② テストしたい期間（過去30日間）
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 29) // 30 days including today
  startDate.setHours(0, 0, 0, 0)

  console.log('==== Query Parameters ====')
  console.log('dogId:', dogId)
  console.log('startDate:', startDate.toISOString())
  console.log('endDate:', endDate.toISOString())
  console.log('')

  const result = await buildWeeklyDataForRange({
    dogId,
    startDate,
    endDate,
  })

  console.log('==== Result ====')
  console.log(`Total weeks: ${result.weeks.length}`)
  console.log('')

  result.weeks.forEach((week, index) => {
    console.log(`\n[Week ${index + 1}] ${week.weekStart} ~ ${week.weekEnd}`)
    console.log(`  Summary: ${week.summaryText.substring(0, 100)}...`)
    console.log(`  Text entries: ${week.weekTexts.length}`)
    console.log(`  Timeline entries: ${week.timelineJson.entries.length}`)
  })
}

main()
  .then(() => {
    console.log('\nDone.')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

