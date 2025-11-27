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
    s.avgFood !== null && s.avgFood > 0
      ? `Your dog ate an average of ${s.avgFood}g of food per day. Appetite appears to be relatively stable, but if there were days with less intake than usual, factors such as physical condition or mood may have influenced it.`
      : null; // Don't include if no data (null or 0)

  const walkDetail =
    s.avgWalkMinutes !== null && s.avgWalkMinutes > 0
      ? `Walks averaged ${s.avgWalkMinutes} minutes per day, covering approximately ${s.avgWalkDistance ?? 0} km. If this is significantly more or less than usual, it may indicate a change in activity level.`
      : null; // Don't include if no data (null or 0)

  const sleepDetail =
    s.avgSleepHour !== null && s.avgSleepHour > 0
      ? `Your dog slept an average of ${s.avgSleepHour} hours per day. If there were days with notably less sleep, stress or environmental changes might be affecting their rest.`
      : null; // Don't include if no data (null or 0)

  const barkDetail =
    s.barkNightCount !== null && s.barkNightCount > 0
      ? `There were ${s.barkNightCount} instances of nighttime barking. If night barking continues, it may be helpful to check for environmental factors or external stimuli.`
      : `There was no notable nighttime barking. It was a calm week overall.`;

  // Build summary sections, only including sections with actual data
  const sections: string[] = [];
  
  sections.push(`Here is ${dogName}'s weekly summary for the period ${weekly.period.start} to ${weekly.period.end}.`);

  if (toiletDetail) {
    sections.push(`【Toilet】\n${toiletDetail}`);
  }

  if (foodDetail) {
    sections.push(`【Meals】\n${foodDetail}`);
  }

  if (walkDetail) {
    sections.push(`【Walks & Activity】\n${walkDetail}`);
  }

  if (sleepDetail) {
    sections.push(`【Sleep】\n${sleepDetail}`);
  }

  if (barkDetail) {
    sections.push(`【Barking】\n${barkDetail}`);
  }

  // Only add conclusion if there's at least one data section
  if (sections.length > 1) {
    sections.push(`This concludes the weekly summary for ${dogName}.\nIf any concerning patterns continue, please keep monitoring them along with next week's records.`);
  } else {
    sections.push(`No activity records were found for ${dogName} during this period.`);
  }

  return sections.join('\n\n');
}
