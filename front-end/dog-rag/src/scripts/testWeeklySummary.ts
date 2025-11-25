// src/scripts/testWeeklySummary.ts
import { buildWeeklySummaryForDog } from '../lib/weeklySummary/weeklySummary' // ← 実際のパスに直してね

async function main() {
  // ① テストしたい犬の ID
  const dogId = 2 // まずは DB に存在する DogProfile.id を使う

  // ② テストしたい1週間の期間
  // 例: 2025-01-10 ~ 2025-01-16
  const weekStart = new Date('2025-11-24')
  const weekEnd = new Date('2025-11-30')

  const { weeklyJson, summary, weekTexts, summaryText } = await buildWeeklySummaryForDog({
    dogId,
    weekStart,
    weekEnd,
  })

  console.log('==== weeklyJson ====')
  console.log(JSON.stringify(weeklyJson, null, 2))

  console.log('\n==== 自然言語の要約文章 ====')
  console.log(summaryText)

  console.log('\n==== DogWeekSummary row ====')
  console.log(summary)

  console.log('\n==== DogWeekText count ====')
  console.log(weekTexts.length, 'entries')
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
