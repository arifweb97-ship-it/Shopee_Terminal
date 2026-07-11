'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatRupiah } from '@/lib/csvParser';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#6366f1', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#18181b', // zinc-900
        border: '1px solid #27272a', // zinc-800
        borderRadius: '6px',
        padding: '12px 16px',
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      }}>
        <p style={{ color: '#fafafa', fontWeight: 600, marginBottom: 6 }}>{label}</p>
        <p style={{ color: '#3b82f6' }}>Komisi: {formatRupiah(payload[0].value)}</p>
        {payload[0].payload.totalOrders !== undefined && (
          <p style={{ color: '#a1a1aa', marginTop: 4 }}>{payload[0].payload.totalOrders} orders</p>
        )}
      </div>
    );
  }
  return null;
};

export default function CommissionChart({ data }) {
  const chartData = data.slice(0, 10).map(d => ({
    name: d.name.length > 12 ? d.name.substring(0, 12) + '…' : d.name,
    fullName: d.name,
    commission: Math.round(d.totalCommission),
    totalOrders: d.totalOrders,
  }));

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
          <Bar dataKey="commission" radius={[2, 2, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
