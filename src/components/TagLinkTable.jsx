'use client';

import { formatRupiah, formatNumber } from '@/lib/csvParser';

export default function TagLinkTable({ data, showDetails = false, onTagLinkClick }) {
  const maxCommission = data.length > 0 ? data[0].totalCommission : 1;

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th style={{ width: 50 }}>#</th>
            <th>TagLink</th>
            <th>Klik</th>
            <th>Orders</th>
            <th>CR</th>
            <th>Penjualan</th>
            <th>Komisi</th>
            <th>EPC</th>
            <th>Durasi</th>
            <th>Performa</th>
            <th>Channel</th>
            {showDetails && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((tag, index) => {
            const barWidth = maxCommission > 0 ? (tag.totalCommission / maxCommission) * 100 : 0;
            const channelEntries = Object.entries(tag.channels).sort((a, b) => b[1] - a[1]);
            const cr = tag.clicks > 0 ? (tag.totalOrders / tag.clicks * 100).toFixed(1) + '%' : '-';
            const epc = tag.clicks > 0 ? formatRupiah(tag.totalCommission / tag.clicks) : '-';
            const duration = tag.avgClickToOrderHours !== null 
              ? `${tag.avgClickToOrderHours.toFixed(1)} Jam` 
              : '-';

            return (
              <tr key={tag.name}>
                <td>
                  <span className={`rank ${index < 3 ? `rank-${index + 1}` : ''}`}>
                    {index + 1}
                  </span>
                </td>
                <td>
                  <span 
                    className="taglink-name" 
                    onClick={() => onTagLinkClick && onTagLinkClick(tag.name)}
                    style={{ cursor: onTagLinkClick ? 'pointer' : 'default' }}
                  >
                    {tag.name}
                  </span>
                </td>
                <td className="text-secondary">{tag.clicks > 0 ? formatNumber(tag.clicks) : '-'}</td>
                <td className="text-primary">{formatNumber(tag.totalOrders)}</td>
                <td className="text-success" style={{ fontWeight: 600 }}>{cr}</td>
                <td className="text-primary">{formatRupiah(tag.totalPurchaseValue)}</td>
                <td className="text-accent">{formatRupiah(tag.totalCommission)}</td>
                <td className="text-warning" style={{ fontWeight: 600 }}>{epc}</td>
                <td className="text-muted">{duration}</td>
                <td style={{ minWidth: 140 }}>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${barWidth}%`,
                        background: index === 0 ? 'var(--accent)' :
                          index === 1 ? 'var(--success)' :
                          index === 2 ? 'var(--warning)' : 'var(--text-muted)',
                      }}
                    />
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {channelEntries.slice(0, 3).map(([ch, count]) => (
                      <span
                        key={ch}
                        className={`badge badge-channel badge-${ch.toLowerCase()}`}
                      >
                        {ch} ({count})
                      </span>
                    ))}
                  </div>
                </td>
                {showDetails && (
                  <td>
                    <button 
                      onClick={() => onTagLinkClick && onTagLinkClick(tag.name)} 
                      className="btn btn-ghost" 
                      style={{ fontSize: 12 }}
                    >
                      Detail →
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏷️</div>
          <h3>Tidak ada data taglink</h3>
          <p>Upload file CSV untuk melihat data</p>
        </div>
      )}
    </div>
  );
}
