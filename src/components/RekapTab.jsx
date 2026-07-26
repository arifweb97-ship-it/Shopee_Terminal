'use client';

import { useMemo, useState } from 'react';
import {
  formatRupiah,
  formatNumber,
  formatPercent,
  formatDateShort,
  aggregateMetaAdsByCampaign,
  crossReferenceAdsWithCommission,
} from '@/lib/csvParser';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const STATUS_CONFIG = {
  cuan: { label: 'CUAN', emoji: '🟢', color: '#00ff00', bg: 'rgba(0, 255, 0, 0.08)', border: 'rgba(0, 255, 0, 0.3)' },
  boncos: { label: 'BONCOS', emoji: '🔴', color: '#ff0000', bg: 'rgba(255, 0, 0, 0.08)', border: 'rgba(255, 0, 0, 0.3)' },
  bep: { label: 'BEP', emoji: '🟡', color: '#ffb000', bg: 'rgba(255, 176, 0, 0.08)', border: 'rgba(255, 176, 0, 0.3)' },
};

export default function RekapTab({ metaAdsData, tagLinkData, commissionData, onCampaignClick }) {
  const [sortField, setSortField] = useState('profitLoss');
  const [sortDir, setSortDir] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all'); // all | cuan | boncos | bep

  const campaigns = useMemo(() => aggregateMetaAdsByCampaign(metaAdsData), [metaAdsData]);

  const crossRef = useMemo(() => {
    if (!tagLinkData || tagLinkData.length === 0) {
      return campaigns.map(c => ({
        ...c,
        revenue: 0, purchaseValue: 0, orders: 0,
        roas: 0, roi: 0,
        profitLoss: -c.totalSpend,
        status: 'boncos',
        matchedTagLink: null, isMatched: false,
        shopeeClicks: 0,
      }));
    }
    return crossReferenceAdsWithCommission(campaigns, tagLinkData);
  }, [campaigns, tagLinkData]);

  // Filter by status
  const filteredCrossRef = useMemo(() => {
    if (filterStatus === 'all') return crossRef;
    return crossRef.filter(c => c.status === filterStatus);
  }, [crossRef, filterStatus]);

  // Sort
  const sortedData = useMemo(() => {
    return [...filteredCrossRef].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [filteredCrossRef, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const getSortArrow = (field) => {
    if (sortField !== field) return ' ⇅';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  // Scoreboard stats
  const totalSpend = crossRef.reduce((s, c) => s + c.totalSpend, 0);
  const totalRevenue = crossRef.reduce((s, c) => s + c.revenue, 0);
  const overallProfitLoss = totalRevenue - totalSpend;
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const cuanCampaigns = crossRef.filter(c => c.status === 'cuan');
  const boncosCampaigns = crossRef.filter(c => c.status === 'boncos');
  const bepCampaigns = crossRef.filter(c => c.status === 'bep');
  const cuanTotal = cuanCampaigns.reduce((s, c) => s + c.profitLoss, 0);
  const boncosTotal = boncosCampaigns.reduce((s, c) => s + c.profitLoss, 0);

  // Top profit & top loss
  const sortedByProfit = [...crossRef].sort((a, b) => b.profitLoss - a.profitLoss);
  const topProfit = sortedByProfit.filter(c => c.profitLoss > 0).slice(0, 5);
  const topLoss = sortedByProfit.filter(c => c.profitLoss < 0).sort((a, b) => a.profitLoss - b.profitLoss).slice(0, 5);

  // Chart data: profit/loss per campaign (sorted by profit)
  const chartData = sortedByProfit.slice(0, 12).map(c => ({
    name: c.campaignName.replace(/\s*Setingan\s*New/gi, '').trim(),
    profit: Math.round(c.profitLoss),
    spend: Math.round(c.totalSpend),
    revenue: Math.round(c.revenue),
  }));

  // Pie chart: cuan vs boncos vs bep
  const pieData = [
    { name: 'Cuan', value: cuanCampaigns.length, color: '#00ff00' },
    { name: 'Boncos', value: boncosCampaigns.length, color: '#ff0000' },
    { name: 'BEP', value: bepCampaigns.length, color: '#ffb000' },
  ].filter(d => d.value > 0);

  // Weekly breakdown
  const weeklyData = useMemo(() => {
    const weekMap = {};

    // Group commission data by week
    const getWeekKey = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay()); // Sunday
      const year = startOfWeek.getFullYear();
      const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const day = String(startOfWeek.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Add ad spend per week
    metaAdsData.forEach(row => {
      const wk = getWeekKey(row.reportStart);
      if (!wk) return;
      if (!weekMap[wk]) weekMap[wk] = { week: wk, spend: 0, commission: 0, orders: new Set(), items: 0 };
      weekMap[wk].spend += row.amountSpent;
    });

    // Add commission per week
    if (commissionData) {
      commissionData.forEach(row => {
        if (!row.orderTime) return;
        const date = row.orderTime.split(' ')[0];
        const wk = getWeekKey(date);
        if (!wk) return;
        if (!weekMap[wk]) weekMap[wk] = { week: wk, spend: 0, commission: 0, orders: new Set(), items: 0 };
        weekMap[wk].commission += row.totalOrderComm;
        weekMap[wk].orders.add(row.orderId);
        weekMap[wk].items += 1;
      });
    }

    return Object.values(weekMap)
      .map(w => ({
        ...w,
        orders: w.orders.size,
        profitLoss: w.commission - w.spend,
        roas: w.spend > 0 ? w.commission / w.spend : 0,
        status: (w.commission - w.spend) > 1000 ? 'cuan' : (w.commission - w.spend) < -1000 ? 'boncos' : 'bep',
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [metaAdsData, commissionData]);

  return (
    <div className="animate-in">
      {/* ===== SCOREBOARD ===== */}
      <section className="section">
        <div className="rekap-scoreboard">
          {/* Overall P/L */}
          <div className={`rekap-score-main ${overallProfitLoss >= 0 ? 'score-cuan' : 'score-boncos'}`}>
            <div className="rekap-score-emoji">{overallProfitLoss >= 0 ? '🏆' : '💀'}</div>
            <div className="rekap-score-label">OVERALL PROFIT / LOSS</div>
            <div className="rekap-score-value" style={{ color: overallProfitLoss >= 0 ? '#00ff00' : '#ff0000' }}>
              {overallProfitLoss >= 0 ? '+' : ''}{formatRupiah(overallProfitLoss)}
            </div>
            <div className="rekap-score-sub">
              Spend: {formatRupiah(totalSpend)} · Komisi: {formatRupiah(totalRevenue)} · ROAS: {overallRoas.toFixed(2)}x
            </div>
          </div>

          {/* Status counts */}
          <div className="rekap-score-row">
            <div
              className={`rekap-score-card score-cuan ${filterStatus === 'cuan' ? 'active' : ''}`}
              onClick={() => setFilterStatus(f => f === 'cuan' ? 'all' : 'cuan')}
              style={{ cursor: 'pointer' }}
            >
              <div className="rekap-score-count">{cuanCampaigns.length}</div>
              <div className="rekap-score-status">🟢 CUAN</div>
              <div className="rekap-score-amount" style={{ color: '#00ff00' }}>+{formatRupiah(cuanTotal)}</div>
            </div>
            <div
              className={`rekap-score-card score-boncos ${filterStatus === 'boncos' ? 'active' : ''}`}
              onClick={() => setFilterStatus(f => f === 'boncos' ? 'all' : 'boncos')}
              style={{ cursor: 'pointer' }}
            >
              <div className="rekap-score-count">{boncosCampaigns.length}</div>
              <div className="rekap-score-status">🔴 BONCOS</div>
              <div className="rekap-score-amount" style={{ color: '#ff0000' }}>{formatRupiah(boncosTotal)}</div>
            </div>
            <div
              className={`rekap-score-card score-bep ${filterStatus === 'bep' ? 'active' : ''}`}
              onClick={() => setFilterStatus(f => f === 'bep' ? 'all' : 'bep')}
              style={{ cursor: 'pointer' }}
            >
              <div className="rekap-score-count">{bepCampaigns.length}</div>
              <div className="rekap-score-status">🟡 BEP</div>
              <div className="rekap-score-amount" style={{ color: '#ffb000' }}>±Rp 0</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CHARTS ===== */}
      <section className="section grid-2">
        {/* Profit/Loss Bar Chart */}
        <div className="card animate-in">
          <div className="card-header"><h3>Ranking Profit / Loss</h3></div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 60, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#888', fontSize: 9 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: '#888', fontSize: 10 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v < -1000 ? `-${(Math.abs(v) / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value;
                      return (
                        <div style={{ background: '#111', border: '1px solid #333', padding: '12px', fontSize: '11px', fontFamily: 'inherit' }}>
                          <p style={{ color: '#fff', fontWeight: 700 }}>{label}</p>
                          <p style={{ color: val >= 0 ? '#00ff00' : '#ff0000', fontWeight: 700, marginTop: 4 }}>
                            {val >= 0 ? '+' : ''}{formatRupiah(val)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="profit" name="Profit/Loss" radius={[2, 2, 0, 0]} maxBarSize={32}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.profit >= 0 ? '#00ff00' : '#ff4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Status Distribution */}
        <div className="card animate-in animate-delay-1">
          <div className="card-header"><h3>Distribusi Status Campaign</h3></div>
          <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#111', border: '1px solid #333', padding: '12px', fontSize: '11px', fontFamily: 'inherit' }}>
                          <p style={{ color: d.color, fontWeight: 700 }}>{d.name}: {d.value} campaign</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, background: d.color }} />
                <span style={{ color: d.color, fontWeight: 600 }}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TOP PROFIT & TOP LOSS ===== */}
      <section className="section grid-2">
        {/* Top Profit */}
        <div className="card animate-in animate-delay-1">
          <div className="card-header"><h3>🏆 Top 5 Campaign Paling CUAN</h3></div>
          {topProfit.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topProfit.map((c, i) => (
                <div
                  key={c.campaignName}
                  className="rekap-rank-item rank-cuan"
                  onClick={() => onCampaignClick && onCampaignClick(c.campaignName)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="rekap-rank-number">#{i + 1}</div>
                  <div className="rekap-rank-info">
                    <div className="rekap-rank-name">{c.campaignName.replace(/\s*Setingan\s*New/gi, '').trim()}</div>
                    <div className="rekap-rank-detail">
                      Spend: {formatRupiah(c.totalSpend)} · Komisi: {formatRupiah(c.revenue)}
                    </div>
                  </div>
                  <div className="rekap-rank-profit" style={{ color: '#00ff00' }}>
                    +{formatRupiah(c.profitLoss)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Belum ada campaign yang CUAN
            </div>
          )}
        </div>

        {/* Top Loss */}
        <div className="card animate-in animate-delay-2">
          <div className="card-header"><h3>💀 Top 5 Campaign Paling BONCOS</h3></div>
          {topLoss.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topLoss.map((c, i) => (
                <div
                  key={c.campaignName}
                  className="rekap-rank-item rank-boncos"
                  onClick={() => onCampaignClick && onCampaignClick(c.campaignName)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="rekap-rank-number">#{i + 1}</div>
                  <div className="rekap-rank-info">
                    <div className="rekap-rank-name">{c.campaignName.replace(/\s*Setingan\s*New/gi, '').trim()}</div>
                    <div className="rekap-rank-detail">
                      Spend: {formatRupiah(c.totalSpend)} · Komisi: {formatRupiah(c.revenue)}
                    </div>
                  </div>
                  <div className="rekap-rank-profit" style={{ color: '#ff0000' }}>
                    {formatRupiah(c.profitLoss)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Belum ada campaign yang BONCOS 🎉
            </div>
          )}
        </div>
      </section>

      {/* ===== RANKING TABLE ===== */}
      <section className="section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Ranking Lengkap — {filterStatus === 'all' ? 'Semua Campaign' : filterStatus.toUpperCase()}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              ({sortedData.length} campaign)
            </span>
          </h2>
          {filterStatus !== 'all' && (
            <button className="btn btn-ghost" onClick={() => setFilterStatus('all')}>
              ✕ Reset Filter
            </button>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {[
                    { key: 'rank', label: '#' },
                    { key: 'campaignName', label: 'Campaign' },
                    { key: 'totalSpend', label: 'Ad Spend' },
                    { key: 'revenue', label: 'Komisi' },
                    { key: 'profitLoss', label: 'Profit/Loss' },
                    { key: 'roas', label: 'ROAS' },
                    { key: 'orders', label: 'Orders' },
                    { key: 'totalClicks', label: 'Clicks' },
                    { key: 'status', label: 'Status' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={col.key !== 'rank' ? () => handleSort(col.key) : undefined}
                      className={col.key !== 'rank' ? `sortable-th${sortField === col.key ? ' sort-active' : ''}` : ''}
                    >
                      {col.label}
                      {col.key !== 'rank' && (
                        <span className={`sort-arrow${sortField === col.key ? ' active' : ''}`}>
                          {getSortArrow(col.key)}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((c, i) => {
                  const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.bep;
                  return (
                    <tr
                      key={c.campaignName}
                      className={`rekap-row rekap-row-${c.status}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onCampaignClick && onCampaignClick(c.campaignName)}
                    >
                      <td>
                        <span className={`rank ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                      </td>
                      <td>
                        <span className="taglink-name" style={{ borderColor: st.border }}>
                          {c.campaignName.replace(/\s*Setingan\s*New/gi, '').trim()}
                        </span>
                      </td>
                      <td style={{ color: '#ff6b6b', fontWeight: 600 }}>{formatRupiah(c.totalSpend)}</td>
                      <td style={{ color: c.revenue > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {c.revenue > 0 ? formatRupiah(c.revenue) : '—'}
                      </td>
                      <td>
                        <span style={{
                          color: c.profitLoss >= 0 ? 'var(--success)' : 'var(--danger)',
                          fontWeight: 700,
                          fontSize: 13,
                        }}>
                          {c.profitLoss >= 0 ? '+' : ''}{formatRupiah(c.profitLoss)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          color: c.roas >= 1 ? 'var(--success)' : c.roas > 0 ? 'var(--warning)' : 'var(--text-muted)',
                          fontWeight: 700,
                        }}>
                          {c.revenue > 0 ? c.roas.toFixed(2) + 'x' : '—'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent)' }}>{c.orders > 0 ? formatNumber(c.orders) : '—'}</td>
                      <td>{formatNumber(c.totalClicks)}</td>
                      <td>
                        <span className={`badge-status badge-status-${c.status}`}>
                          {st.emoji} {st.label}
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

      {/* ===== WEEKLY BREAKDOWN ===== */}
      {weeklyData.length > 0 && (
        <section className="section">
          <h2 className="section-title">Rekap Per Minggu</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weeklyData.map(w => {
              const st = STATUS_CONFIG[w.status] || STATUS_CONFIG.bep;
              const weekEnd = new Date(w.week);
              weekEnd.setDate(weekEnd.getDate() + 6);
              const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

              return (
                <div key={w.week} className="daily-card" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="daily-date" style={{ marginBottom: 0 }}>
                      <span>📅 {formatDateShort(w.week)} — {formatDateShort(weekEndStr)}</span>
                    </div>
                    <span className={`badge-status badge-status-${w.status}`}>
                      {st.emoji} {st.label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                    <div>
                      <div className="daily-stat-label">💸 Ad Spend</div>
                      <div className="daily-stat-value" style={{ color: w.spend > 0 ? '#ff6b6b' : 'var(--text-muted)' }}>
                        {w.spend > 0 ? formatRupiah(w.spend) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="daily-stat-label">💰 Komisi</div>
                      <div className="daily-stat-value" style={{ color: w.commission > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {w.commission > 0 ? formatRupiah(w.commission) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="daily-stat-label">📊 Profit/Loss</div>
                      <div className="daily-stat-value" style={{
                        color: w.profitLoss >= 0 ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 700,
                      }}>
                        {w.profitLoss >= 0 ? '+' : ''}{formatRupiah(w.profitLoss)}
                      </div>
                    </div>
                    <div>
                      <div className="daily-stat-label">📈 ROAS</div>
                      <div className="daily-stat-value" style={{
                        color: w.roas >= 1 ? 'var(--success)' : w.roas > 0 ? 'var(--warning)' : 'var(--text-muted)',
                      }}>
                        {w.spend > 0 && w.commission > 0 ? w.roas.toFixed(2) + 'x' : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="daily-stat-label">📦 Orders</div>
                      <div className="daily-stat-value" style={{ color: 'var(--accent)' }}>
                        {w.orders > 0 ? formatNumber(w.orders) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
