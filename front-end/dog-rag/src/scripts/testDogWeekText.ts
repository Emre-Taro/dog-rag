// src/scripts/testDogWeekText.ts
import { buildDogWeekText } from '../lib/weeklyText/dogWeekText'

async function main() {
  // ① テストしたい犬の ID
  const dogId = 2 // まずは DB に存在する DogProfile.id を使う

  // ② テストしたい1週間の期間
  // 例: 2025-11-24 ~ 2025-11-30
  const weekStart = new Date('2025-11-24')
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date('2025-11-30')
  weekEnd.setHours(23, 59, 59, 999)

  console.log('==== Query Parameters ====')
  console.log('dogId:', dogId)
  console.log('weekStart:', weekStart.toISOString())
  console.log('weekEnd:', weekEnd.toISOString())
  console.log('')

  const { weekTexts, timelineJson } = await buildDogWeekText({
    dogId,
    weekStart,
    weekEnd,
  })

  console.log('==== DogWeekText entries ====')
  console.log(`Total entries: ${weekTexts.length}`)
  weekTexts.forEach((entry, index) => {
    console.log(`\n[${index + 1}] ${entry.category} - ${entry.eventAt.toISOString()}`)
    if (entry.title) {
      console.log(`  Title: ${entry.title}`)
    }
    console.log(`  Content: ${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}`)
  })

  console.log('\n==== Timeline JSON ====')
  console.log(JSON.stringify(timelineJson, null, 2))
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

