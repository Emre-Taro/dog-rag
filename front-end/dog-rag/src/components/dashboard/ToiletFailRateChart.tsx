'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ToiletFailRateData {
  date: string;
  failRate: number;
  total: number;
  failed: number;
}

interface ToiletFailRateChartProps {
  data: ToiletFailRateData[];
}

export function ToiletFailRateChart({ data }: ToiletFailRateChartProps) {
  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={{ stroke: '#4b5563' }}
            label={{ value: '%', position: 'insideTopLeft', fill: '#9ca3af', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number, name: string) => {
              if (name === 'failRate') {
                return [`${value.toFixed(1)}%`, '失敗率'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => {
              const item = formattedData.find((d) => d.dateLabel === label);
              return item ? new Date(item.date).toLocaleDateString('ja-JP') : label;
            }}
          />
          <Line
            type="monotone"
            dataKey="failRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 3 }}
            activeDot={{ r: 5 }}
            name="失敗率"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

