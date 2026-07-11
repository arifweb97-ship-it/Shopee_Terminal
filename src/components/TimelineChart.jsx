'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatRupiah, formatDateShort } from '@/lib/csvParser';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '6px',
        padding: '12px 16px',
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      }}>
        <p style={{ color: '#fafafa', fontWeight: 600, marginBottom: 6 }}>{formatDateShort(label)}</p>
        <p style={{ color: '#3b82f6' }}>Komisi: {formatRupiah(payload[0]?.value)}</p>
        <p style={{ color: '#10b981', marginTop: 4 }}>Orders: {payload[1]?.value || 0}</p>
      </div>
    );
  }
  return null;
};

export default function TimelineChart({ data }) {
  const chartData = data.map(d => ({
    date: d.date,
    commission: Math.round(d.totalCommission),
    orders: d.orders,
  }));

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
          />
          <YAxis
            yAxisId="commission"
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="commission"
            type="monotone"
            dataKey="commission"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorComm)"
          />
          <Area
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorOrders)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
