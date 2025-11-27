'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarkNightData {
  date: string;
  count: number;
}

interface BarkNightChartProps {
  data: BarkNightData[];
}

export function BarkNightChart({ data }: BarkNightChartProps) {
  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={{ stroke: '#4b5563' }}
            label={{ value: '回数', position: 'insideTopLeft', fill: '#9ca3af', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`${value}回`, '夜間の鳴き声']}
            labelFormatter={(label) => {
              const item = formattedData.find((d) => d.dateLabel === label);
              return item ? new Date(item.date).toLocaleDateString('ja-JP') : label;
            }}
          />
          <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="夜間の鳴き声" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

