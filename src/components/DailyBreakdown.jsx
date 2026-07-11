'use client';

import { useState } from 'react';
import { formatRupiah, formatNumber, formatDateShort, getDayName } from '@/lib/csvParser';

export default function DailyBreakdown({ data }) {
  const [expandedDate, setExpandedDate] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[...data].reverse().map((day) => {
        const isExpanded = expandedDate === day.date;
        const channelEntries = Object.entries(day.channels).sort((a, b) => b[1] - a[1]);

        return (
          <div key={day.date} className="daily-card" onClick={() => setExpandedDate(isExpanded ? null : day.date)}>
            <div className="daily-date">
              <span>📅 {formatDateShort(day.date)}</span>
              <span className="day-name">{getDayName(day.date)}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                {isExpanded ? '▲ Tutup' : '▼ Detail'}
              </span>
            </div>

            <div className="daily-stats">
              <div>
                <div className="daily-stat-value">{formatNumber(day.orders)}</div>
                <div className="daily-stat-label">Orders</div>
              </div>
              <div>
                <div className="daily-stat-value" style={{ color: 'var(--accent)' }}>
                  {formatRupiah(day.totalCommission)}
                </div>
                <div className="daily-stat-label">Komisi</div>
              </div>
              <div>
                <div className="daily-stat-value" style={{ color: 'var(--purple)' }}>
                  {formatRupiah(day.totalPurchaseValue)}
                </div>
                <div className="daily-stat-label">Penjualan</div>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                {/* Channel badges */}
                <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {channelEntries.map(([ch, count]) => (
                    <span key={ch} className={`badge badge-channel badge-${ch.toLowerCase()}`}>
                      {ch}: {count} item
                    </span>
                  ))}
                </div>

                {/* TagLink breakdown */}
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Breakdown per TagLink
                </div>
                <div className="table-container">
                  <table style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>TagLink</th>
                        <th>Orders</th>
                        <th>Items</th>
                        <th>Penjualan</th>
                        <th>Komisi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.tagLinks.map(tl => (
                        <tr key={tl.name}>
                          <td>
                            <span className="taglink-name" style={{ fontSize: 11 }}>{tl.name}</span>
                          </td>
                          <td className="text-primary">{formatNumber(tl.orders)}</td>
                          <td>{formatNumber(tl.items)}</td>
                          <td>{formatRupiah(tl.purchaseValue)}</td>
                          <td className="text-accent">{formatRupiah(tl.commission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {data.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Tidak ada data harian</h3>
          <p>Upload file CSV untuk melihat breakdown harian</p>
        </div>
      )}
    </div>
  );
}
