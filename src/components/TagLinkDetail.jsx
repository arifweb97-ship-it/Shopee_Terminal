'use client';

import { useMemo, useState } from 'react';
import {
  formatRupiah,
  formatNumber,
  formatDateTime,
  formatDateShort,
  getTimeDiffHours,
  getDayName,
} from '@/lib/csvParser';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CHANNEL_COLORS = {
  Facebook: '#3b82f6', // blue-500
  Instagram: '#ec4899', // pink-500
  Others: '#a1a1aa', // zinc-400
  Unknown: '#71717a', // zinc-500
};

const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#6366f1', '#14b8a6'];

const ITEMS_PER_PAGE = 50;

export default function TagLinkDetail({ tagName, data, tagInfo, onBack }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortArrow = (field) => {
    if (sortField !== field) return ' ⇅';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };
  
  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'orderId':
          valA = a.orderId || ''; valB = b.orderId || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'itemName':
          valA = a.itemName || ''; valB = b.itemName || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'clickTime':
          valA = a.clickTime || ''; valB = b.clickTime || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'orderTime':
          valA = a.orderTime || ''; valB = b.orderTime || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'gap':
          valA = getTimeDiffHours(a.clickTime, a.orderTime) ?? -1;
          valB = getTimeDiffHours(b.clickTime, b.orderTime) ?? -1;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'qty':
          valA = a.qty || 0; valB = b.qty || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'purchaseValue':
          valA = a.purchaseValue || 0; valB = b.purchaseValue || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'totalOrderComm':
          valA = a.totalOrderComm || 0; valB = b.totalOrderComm || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'channel':
          valA = a.channel || ''; valB = b.channel || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'orderStatus':
          valA = a.orderStatus || ''; valB = b.orderStatus || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        default:
          return 0;
      }
    });
  }, [data, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalOrders = new Set(data.map(r => r.orderId)).size;
  const totalCommission = data.reduce((sum, r) => sum + r.totalOrderComm, 0);
  const totalPurchaseValue = data.reduce((sum, r) => sum + r.purchaseValue, 0);

  // Channel breakdown
  const channelData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const ch = r.channel || 'Unknown';
      if (!map[ch]) map[ch] = { name: ch, count: 0, commission: 0 };
      map[ch].count++;
      map[ch].commission += r.totalOrderComm;
    });
    return Object.values(map).sort((a, b) => b.commission - a.commission);
  }, [data]);

  // Category breakdown
  const catData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const cat = r.category || 'Lainnya';
      if (!map[cat]) map[cat] = { name: cat, count: 0 };
      map[cat].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [data]);

  // Daily breakdown
  const dailyData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      if (!r.orderTime) return;
      const date = r.orderTime.split(' ')[0];
      if (!date) return;
      if (!map[date]) map[date] = { date, orders: new Set(), commission: 0, purchaseValue: 0 };
      map[date].orders.add(r.orderId);
      map[date].commission += r.totalOrderComm;
      map[date].purchaseValue += r.purchaseValue;
    });
    return Object.values(map)
      .map(d => ({ ...d, orders: d.orders.size, commission: Math.round(d.commission) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Click-to-order time analysis
  const avgTimeDiff = useMemo(() => {
    const diffs = data
      .map(r => getTimeDiffHours(r.clickTime, r.orderTime))
      .filter(v => v !== null && v >= 0);
    return diffs.length > 0 ? (diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '50vh' }}>
        <div className="empty-icon">🏷️</div>
        <h3>Data tidak ditemukan untuk &quot;{tagName}&quot;</h3>
        <p>Gunakan filter rentang waktu yang lebih luas atau cek ejaan nama taglink.</p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: 16 }}>
          ← Kembali ke Overview
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <button onClick={onBack} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        ← Kembali ke Overview
      </button>

      <header className="page-header" style={{ borderBottom: 'none', padding: '8px 0 20px' }}>
        <h2 style={{ fontSize: 20, color: 'var(--text-primary)' }}>🏷️ {tagName}</h2>
        <p className="page-meta">{formatNumber(data.length)} item data · {dailyData.length} hari aktif</p>
      </header>

      {/* Summary */}
      <section className="section grid-4" style={tagInfo?.clicks > 0 ? { gridTemplateColumns: 'repeat(5, 1fr)' } : {}}>
        {tagInfo?.clicks > 0 && (
          <div className="summary-card accent-pink">
            <div className="card-icon">🖱️</div>
            <div className="card-label">Klik</div>
            <div className="card-value">{formatNumber(tagInfo.clicks)}</div>
            <div className="card-sub">
              CR: {((totalOrders / tagInfo.clicks) * 100).toFixed(1)}%
            </div>
          </div>
        )}
        <div className="summary-card accent-cyan">
          <div className="card-icon">📦</div>
          <div className="card-label">Orders</div>
          <div className="card-value">{formatNumber(totalOrders)}</div>
        </div>
        <div className="summary-card accent-green">
          <div className="card-icon">💰</div>
          <div className="card-label">Komisi</div>
          <div className="card-value">{formatRupiah(totalCommission)}</div>
        </div>
        <div className="summary-card accent-purple">
          <div className="card-icon">🛒</div>
          <div className="card-label">Penjualan</div>
          <div className="card-value">{formatRupiah(totalPurchaseValue)}</div>
        </div>
        <div className="summary-card accent-orange">
          <div className="card-icon">⏱️</div>
          <div className="card-label">Avg Klik→Order</div>
          <div className="card-value">{avgTimeDiff.toFixed(1)}j</div>
          <div className="card-sub">Dari klik ke checkout</div>
        </div>
      </section>

      {/* Charts row */}
      <section className="section grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Trend Harian</h3>
          </div>
          <div className="chart-wrapper-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={{ stroke: '#27272a' }}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={{ stroke: '#27272a' }}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{
                          background: '#18181b', // zinc-900
                          border: '1px solid #27272a', // zinc-800
                          borderRadius: '6px',
                          padding: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        }}>
                          <p style={{ color: '#fafafa', fontWeight: 600 }}>{formatDateShort(label)}</p>
                          <p style={{ color: '#3b82f6', marginTop: 4 }}>Komisi: {formatRupiah(payload[0].value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="commission" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Channel & Kategori</h3>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              Channel
            </div>
            {channelData.map(ch => (
              <div key={ch.name} className="stat-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '2px', background: CHANNEL_COLORS[ch.name] || '#64748b' }} />
                  <span className="stat-label">{ch.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({ch.count})</span>
                </div>
                <span className="stat-value">{formatRupiah(ch.commission)}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              Top Kategori
            </div>
            {catData.map((cat, i) => (
              <div key={cat.name} className="stat-row">
                <span className="stat-label" style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.name}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: CAT_COLORS[i % CAT_COLORS.length] }}>{cat.count} item</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Orders table */}
      <section className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>Detail Pesanan</h2>
            <p className="section-subtitle" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Menampilkan {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, data.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} dari {formatNumber(data.length)} pesanan
            </p>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
        
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {[
                    { key: 'orderId', label: 'Order ID' },
                    { key: 'itemName', label: 'Produk' },
                    { key: 'clickTime', label: 'Klik' },
                    { key: 'orderTime', label: 'Checkout' },
                    { key: 'gap', label: 'Gap (jam)' },
                    { key: 'qty', label: 'Qty' },
                    { key: 'purchaseValue', label: 'Penjualan' },
                    { key: 'totalOrderComm', label: 'Komisi' },
                    { key: 'channel', label: 'Channel' },
                    { key: 'orderStatus', label: 'Status' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`sortable-th${sortField === col.key ? ' sort-active' : ''}`}
                    >
                      {col.label}
                      <span className={`sort-arrow${sortField === col.key ? ' active' : ''}`}>
                        {getSortArrow(col.key)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, i) => {
                  const gap = getTimeDiffHours(row.clickTime, row.orderTime);
                  return (
                    <tr key={`${row.orderId}-${i}`}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{row.orderId}</td>
                      <td className="text-primary" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.itemName}>
                        {row.itemName.length > 40 ? row.itemName.substring(0, 40) + '…' : row.itemName}
                      </td>
                      <td style={{ fontSize: 11 }}>{formatDateTime(row.clickTime)}</td>
                      <td style={{ fontSize: 11 }}>{formatDateTime(row.orderTime)}</td>
                      <td>
                        {gap !== null ? (
                          <span style={{
                            color: gap < 1 ? 'var(--success)' : gap < 12 ? 'var(--warning)' : 'var(--danger)',
                            fontWeight: 600,
                            fontSize: 11,
                          }}>
                            {gap.toFixed(1)}h
                          </span>
                        ) : '-'}
                      </td>
                      <td>{row.qty}</td>
                      <td>{formatRupiah(row.purchaseValue)}</td>
                      <td className="text-accent">{formatRupiah(row.totalOrderComm)}</td>
                      <td>
                        <span className={`badge badge-channel badge-${row.channel.toLowerCase()}`}>
                          {row.channel}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${row.orderStatus.toLowerCase()}`}>
                          {row.orderStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Daily breakdown */}
      <section className="section">
        <h2 className="section-title">Breakdown Harian — {tagName}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...dailyData].reverse().map(day => (
            <div key={day.date} className="daily-card" style={{ cursor: 'default' }}>
              <div className="daily-date">
                <span>📅 {formatDateShort(day.date)}</span>
                <span className="day-name">{getDayName(day.date)}</span>
              </div>
              <div className="daily-stats">
                <div>
                  <div className="daily-stat-value">{formatNumber(day.orders)}</div>
                  <div className="daily-stat-label">Orders</div>
                </div>
                <div>
                  <div className="daily-stat-value" style={{ color: 'var(--accent)' }}>{formatRupiah(day.commission)}</div>
                  <div className="daily-stat-label">Komisi</div>
                </div>
                <div>
                  <div className="daily-stat-value" style={{ color: 'var(--purple)' }}>{formatRupiah(day.purchaseValue)}</div>
                  <div className="daily-stat-label">Penjualan</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
