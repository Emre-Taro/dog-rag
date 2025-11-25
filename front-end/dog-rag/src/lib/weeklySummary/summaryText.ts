import type { WeeklyDogJson } from './weeklySummary';

export function formatWeeklySummaryText(
  dogName: string,
  weekly: WeeklyDogJson
): string {
  const s = weekly.summary;

  function line(label: string, value: string | number | null) {
    return value !== null ? `- ${label}：${value}` : null;
  }

  const toiletDetail =
    s.toiletFailRate !== null
      ? `トイレは1週間での失敗率が ${s.toiletFailRate}% でした。失敗が多い日が続くようであれば、生活リズムの見直しや体調チェックが必要かもしれません。`
      : `この週はトイレ関連の記録がありませんでした。`;

  const foodDetail =
    s.avgFood !== null
      ? `食事は1日平均 ${s.avgFood}g 食べていました。食欲は比較的安定しているように見えますが、いつもより少なかった日がある場合は、犬の体調や気分の影響も考えられます。`
      : `食事量の記録が不足しているため、この週の食事傾向は判断できませんでした。`;

  const walkDetail =
    s.avgWalkMinutes !== null
      ? `散歩は1日平均 ${s.avgWalkMinutes}分、距離は約 ${s.avgWalkDistance ?? 0}km でした。通常より多い/少ない場合は、運動量の変化として注意しておくと良いです。`
      : `散歩の記録がありませんでした。`;

  const sleepDetail =
    s.avgSleepHour !== null
      ? `睡眠時間は1日平均 ${s.avgSleepHour}時間でした。とくに寝不足の日がある場合は、ストレスや環境の変化が影響している可能性があります。`
      : `睡眠のログがないため、睡眠傾向は把握できませんでした。`;

  const barkDetail =
    s.barkNightCount !== null && s.barkNightCount > 0
      ? `夜間の吠えは合計 ${s.barkNightCount}回ありました。深夜の吠えが続くようなら、生活環境や外的刺激のチェックが必要かもしれません。`
      : `夜間の無駄吠えは特にありませんでした。落ち着いた1週間でした。`;

  return `
${dogName} の 1週間（${weekly.period.start}〜${weekly.period.end}）の記録まとめです。

【トイレ】
${toiletDetail}

【食事】
${foodDetail}

【散歩・運動】
${walkDetail}

【睡眠】
${sleepDetail}

【吠え】
${barkDetail}

以上が${dogName}の1週間の記録まとめとなります。
もし気になる傾向が続く場合は、次週以降の記録とあわせて継続的に観察していきましょう。
  `.trim();
}