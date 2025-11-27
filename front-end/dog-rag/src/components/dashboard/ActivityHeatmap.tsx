'use client';

interface ActivityHeatmapData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: ActivityHeatmapData[];
  days: number;
}

export function ActivityHeatmap({ data, days }: ActivityHeatmapProps) {
  // Create a map for quick lookup
  const dataMap = new Map(data.map((item) => [item.date, item.count]));
  
  // Find max count for color intensity
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  // Generate date range
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dates: Array<{ date: Date; count: number }> = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    dates.push({
      date,
      count: dataMap.get(dateStr) || 0,
    });
  }

  // Group by weeks for better layout (7 days per row)
  const weeks: Array<Array<{ date: Date; count: number }>> = [];
  const daysPerRow = 7;
  
  for (let i = 0; i < dates.length; i += daysPerRow) {
    weeks.push(dates.slice(i, i + daysPerRow));
  }

  // Calculate color intensity
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-slate-800';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return 'bg-blue-900';
    if (intensity < 0.5) return 'bg-blue-700';
    if (intensity < 0.75) return 'bg-blue-500';
    return 'bg-blue-400';
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex gap-1">
            {week.map((item) => {
              const dayLabel = item.date.getDate();
              const monthLabel = item.date.getMonth() + 1;
              const isToday = item.date.toDateString() === today.toDateString();
              
              return (
                <div
                  key={item.date.toISOString()}
                  className={`relative flex h-10 w-10 items-center justify-center rounded text-[10px] transition-all hover:scale-110 ${getColorIntensity(
                    item.count
                  )} ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                  title={`${monthLabel}/${dayLabel}: ${item.count}件`}
                >
                  {item.count > 0 && (
                    <span className="text-slate-100 font-semibold">{item.count}</span>
                  )}
                </div>
              );
            })}
            {/* Pad with empty cells if week is incomplete */}
            {week.length < daysPerRow && Array.from({ length: daysPerRow - week.length }).map((_, i) => (
              <div key={`pad-${i}`} className="h-10 w-10" />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>少ない</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded bg-slate-800"></div>
          <div className="h-3 w-3 rounded bg-blue-900"></div>
          <div className="h-3 w-3 rounded bg-blue-700"></div>
          <div className="h-3 w-3 rounded bg-blue-500"></div>
          <div className="h-3 w-3 rounded bg-blue-400"></div>
        </div>
        <span>多い</span>
      </div>
    </div>
  );
}

