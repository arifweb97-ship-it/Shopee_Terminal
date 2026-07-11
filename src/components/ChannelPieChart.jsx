'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatRupiah, formatNumber } from '@/lib/csvParser';

const CHANNEL_COLORS = {
  Facebook: '#3b82f6', // blue-500
  Instagram: '#ec4899', // pink-500
  Others: '#a1a1aa', // zinc-400
  Unknown: '#71717a', // zinc-500
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div style={{
        background: '#18181b', // zinc-900
        border: '1px solid #27272a', // zinc-800
        borderRadius: '6px',
        padding: '12px 16px',
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      }}>
        <p style={{ color: '#fafafa', fontWeight: 600, marginBottom: 6 }}>{d.name}</p>
        <p style={{ color: d.payload.fill }}>Komisi: {formatRupiah(d.payload.totalCommission)}</p>
        <p style={{ color: '#a1a1aa', marginTop: 4 }}>{d.payload.orders} orders</p>
      </div>
    );
  }
  return null;
};

export default function ChannelPieChart({ data }) {
  const totalComm = data.reduce((sum, d) => sum + d.totalCommission, 0);

  return (
    <div>
      <div className="chart-wrapper-sm">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="totalCommission"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              stroke="#09090b"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || '#64748b'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 8 }}>
        {data.map(ch => {
          const pct = totalComm > 0 ? ((ch.totalCommission / totalComm) * 100).toFixed(1) : 0;
          return (
            <div key={ch.name} className="stat-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '2px',
                  background: CHANNEL_COLORS[ch.name] || '#64748b',
                }} />
                <span className="stat-label">{ch.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
                <span className="stat-value">{formatRupiah(ch.totalCommission)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
