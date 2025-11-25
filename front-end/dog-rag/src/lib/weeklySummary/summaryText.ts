import type { WeeklyDogJson } from './weeklySummary';

export function formatWeeklySummaryText(
  dogName: string,
  weekly: WeeklyDogJson
): string {
  const s = weekly.summary;

  function line(label: string, value: string | number | null) {
    return value !== null ? `- ${label}: ${value}` : null;
  }

  const toiletDetail =
    s.toiletFailRate !== null
      ? `The toilet training failure rate this week was ${s.toiletFailRate}%. If the number of accidents increases over consecutive days, it may be worth reviewing the daily routine or checking your dog's physical condition.`
      : `There were no toilet-related records for this week.`;

  const foodDetail =
    s.avgFood !== null
      ? `Your dog ate an average of ${s.avgFood}g of food per day. Appetite appears to be relatively stable, but if there were days with less intake than usual, factors such as physical condition or mood may have influenced it.`
      : `Due to insufficient meal records, the eating pattern for this week could not be evaluated.`;

  const walkDetail =
    s.avgWalkMinutes !== null
      ? `Walks averaged ${s.avgWalkMinutes} minutes per day, covering approximately ${s.avgWalkDistance ?? 0} km. If this is significantly more or less than usual, it may indicate a change in activity level.`
      : `There were no walk records for this week.`;

  const sleepDetail =
    s.avgSleepHour !== null
      ? `Your dog slept an average of ${s.avgSleepHour} hours per day. If there were days with notably less sleep, stress or environmental changes might be affecting their rest.`
      : `There were no sleep logs, so sleep patterns for this week could not be assessed.`;

  const barkDetail =
    s.barkNightCount !== null && s.barkNightCount > 0
      ? `There were ${s.barkNightCount} instances of nighttime barking. If night barking continues, it may be helpful to check for environmental factors or external stimuli.`
      : `There was no notable nighttime barking. It was a calm week overall.`;

  return `
Here is ${dogName}'s weekly summary for the period ${weekly.period.start} to ${weekly.period.end}.

【Toilet】
${toiletDetail}

【Meals】
${foodDetail}

【Walks & Activity】
${walkDetail}

【Sleep】
${sleepDetail}

【Barking】
${barkDetail}

This concludes the weekly summary for ${dogName}.
If any concerning patterns continue, please keep monitoring them along with next week's records.
  `.trim();
}
