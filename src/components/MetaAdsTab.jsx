'use client';

import { useMemo, useState } from 'react';
import {
  formatRupiah,
  formatNumber,
  formatPercent,
  formatDateShort,
  getDayName,
  aggregateMetaAdsByCampaign,
  aggregateMetaAdsByPlacement,
  aggregateMetaAdsByPlatform,
  crossReferenceAdsWithCommission,
  crossReferenceDaily,
} from '@/lib/csvParser';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';

const PLATFORM_COLORS = {
  Facebook: '#3b82f6',
  Instagram: '#ec4899',
  Threads: '#a855f7',
};

const STATUS_CONFIG = {
  cuan: { label: 'CUAN', emoji: '🟢', color: '#00ff00' },
  boncos: { label: 'BONCOS', emoji: '🔴', color: '#ff0000' },
  bep: { label: 'BEP', emoji: '🟡', color: '#ffb000' },
};

export default function MetaAdsTab({ metaAdsData, allMetaAdsData, tagLinkData, commissionData, onCampaignClick }) {
  const [sortField, setSortField] = useState('totalSpend');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('campaigns'); // campaigns | placements | platforms | daily

  const campaigns = useMemo(() => aggregateMetaAdsByCampaign(metaAdsData), [metaAdsData]);
  const placements = useMemo(() => aggregateMetaAdsByPlacement(metaAdsData), [metaAdsData]);
  const platforms = useMemo(() => aggregateMetaAdsByPlatform(metaAdsData), [metaAdsData]);

  // Daily cross-reference: ad spend vs commission per date
  const dailyCrossRef = useMemo(() => {
    return crossReferenceDaily(metaAdsData, commissionData || []);
  }, [metaAdsData, commissionData]);

  const crossRef = useMemo(() => {
    if (!tagLinkData || tagLinkData.length === 0) return campaigns.map(c => ({ ...c, revenue: 0, purchaseValue: 0, orders: 0, roas: 0, roi: 0, profitLoss: -c.totalSpend, status: 'boncos', matchedTagLink: null, isMatched: false }));
    return crossReferenceAdsWithCommission(campaigns, tagLinkData);
  }, [campaigns, tagLinkData]);

  const sortedCrossRef = useMemo(() => {
    return [...crossRef].sort((a, b) => {
      let va, vb;
      if (sortField === 'dropOff') {
        // Compute drop-off on the fly for sorting
        va = (a.totalClicks > 0 && a.shopeeClicks > 0) ? ((a.totalClicks - a.shopeeClicks) / a.totalClicks * 100) : -999;
        vb = (b.totalClicks > 0 && b.shopeeClicks > 0) ? ((b.totalClicks - b.shopeeClicks) / b.totalClicks * 100) : -999;
      } else {
        va = a[sortField] ?? 0;
        vb = b[sortField] ?? 0;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [crossRef, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const getSortArrow = (field) => {
    if (sortField !== field) return ' ⇅';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  // Summary stats
  const totalSpend = crossRef.reduce((s, c) => s + c.totalSpend, 0);
  const totalImpressions = crossRef.reduce((s, c) => s + c.totalImpressions, 0);
  const totalReach = crossRef.reduce((s, c) => s + c.totalReach, 0);
  const totalClicks = crossRef.reduce((s, c) => s + c.totalClicks, 0);
  const totalShopeeClicks = crossRef.reduce((s, c) => s + (c.shopeeClicks || 0), 0);
  const totalRevenue = crossRef.reduce((s, c) => s + c.revenue, 0);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const overallProfitLoss = totalRevenue - totalSpend;
  const totalCampaigns = crossRef.length;
  const cuanCount = crossRef.filter(c => c.status === 'cuan').length;
  const boncosCount = crossRef.filter(c => c.status === 'boncos').length;
  const overallDropOff = totalClicks > 0 && totalShopeeClicks > 0 ? ((totalClicks - totalShopeeClicks) / totalClicks * 100) : null;

  // Unique ad dates for display
  const adDates = [...new Set(metaAdsData.map(r => r.reportStart).filter(Boolean))].sort();
  const dateRangeLabel = adDates.length > 0
    ? adDates.length === 1
      ? formatDateShort(adDates[0])
      : `${formatDateShort(adDates[0])} — ${formatDateShort(adDates[adDates.length - 1])}`
    : '';

  // Chart data for top campaigns
  const chartData = crossRef.slice(0, 10).map(c => ({
    name: c.campaignName.replace(/\s*Setingan\s*New/gi, '').trim(),
    spend: Math.round(c.totalSpend),
    revenue: Math.round(c.revenue),
    profit: Math.round(c.profitLoss),
  }));

  // Daily chart data
  const dailyChartData = dailyCrossRef.map(d => ({
    name: formatDateShort(d.date),
    date: d.date,
    spend: Math.round(d.spend),
    commission: Math.round(d.commission),
    profit: Math.round(d.profitLoss),
  }));

  // Placement chart data
  const placementChartData = placements.slice(0, 8).map(p => ({
    name: p.placement,
    spend: Math.round(p.spend),
    clicks: p.clicks,
  }));

  return (
    <div className="animate-in">
      {/* Date info banner */}
      {dateRangeLabel && (
        <div style={{
          padding: '8px 12px',
          marginBottom: 16,
          border: '1px solid var(--border-color)',
          background: 'rgba(0,255,255,0.03)',
          fontSize: 11,
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ color: 'var(--accent)' }}>📅</span>
          <span>Data iklan: <strong style={{ color: 'var(--text-primary)' }}>{dateRangeLabel}</strong></span>
          <span style={{ marginLeft: 'auto' }}>{metaAdsData.length} rows · {adDates.length} hari</span>
        </div>
      )}

      {/* Summary Cards */}
      <section className="section">
        <div className="meta-ads-summary-grid">
          <div className="summary-card accent-cyan animate-in">
            <div className="card-icon">💸</div>
            <div className="card-label">Total Ad Spend</div>
            <div className="card-value">{formatRupiah(totalSpend)}</div>
            <div className="card-sub">{totalCampaigns} campaign aktif</div>
          </div>
          <div className="summary-card accent-green animate-in animate-delay-1">
            <div className="card-icon">👁️</div>
            <div className="card-label">Impressions</div>
            <div className="card-value">{formatNumber(totalImpressions)}</div>
            <div className="card-sub">Reach: {formatNumber(totalReach)}</div>
          </div>
          <div className="summary-card accent-purple animate-in animate-delay-2">
            <div className="card-icon">🖱️</div>
            <div className="card-label">Meta Clicks</div>
            <div className="card-value">{formatNumber(totalClicks)}</div>
            <div className="card-sub">CTR: {formatPercent(avgCtr)}</div>
          </div>
          {totalShopeeClicks > 0 && (
            <div className="summary-card accent-cyan animate-in animate-delay-2">
              <div className="card-icon">🛒</div>
              <div className="card-label">Shopee Clicks</div>
              <div className="card-value">{formatNumber(totalShopeeClicks)}</div>
              <div className="card-sub">
                {overallDropOff !== null ? (
                  <span style={{ color: overallDropOff > 50 ? 'var(--danger)' : overallDropOff > 25 ? 'var(--warning)' : 'var(--success)' }}>
                    Drop-off: {overallDropOff.toFixed(1)}%
                  </span>
                ) : 'Dari Shopee Affiliate'}
              </div>
            </div>
          )}
          <div className="summary-card accent-orange animate-in animate-delay-2">
            <div className="card-icon">💰</div>
            <div className="card-label">Avg CPC</div>
            <div className="card-value">{formatRupiah(avgCpc)}</div>
            <div className="card-sub">Per link click</div>
          </div>
          {tagLinkData && tagLinkData.length > 0 && (
            <>
              <div className="summary-card accent-green animate-in animate-delay-3">
                <div className="card-icon">📈</div>
                <div className="card-label">ROAS</div>
                <div className="card-value" style={{ color: overallRoas >= 1 ? 'var(--success)' : 'var(--danger)' }}>
                  {overallRoas.toFixed(2)}x
                </div>
                <div className="card-sub">{overallRoas >= 1 ? 'Profitable' : 'Below target'}</div>
              </div>
              <div className={`summary-card ${overallProfitLoss >= 0 ? 'accent-green' : 'accent-danger'} animate-in animate-delay-3`}>
                <div className="card-icon">{overallProfitLoss >= 0 ? '🟢' : '🔴'}</div>
                <div className="card-label">Profit / Loss</div>
                <div className="card-value" style={{ color: overallProfitLoss >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {overallProfitLoss >= 0 ? '+' : ''}{formatRupiah(overallProfitLoss)}
                </div>
                <div className="card-sub">🟢 {cuanCount} Cuan · 🔴 {boncosCount} Boncos</div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Sub-tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { key: 'campaigns', label: 'CAMPAIGNS' },
          { key: 'daily', label: 'HARIAN' },
          { key: 'placements', label: 'PLACEMENTS' },
          { key: 'platforms', label: 'PLATFORMS' },
        ].map(t => (
          <button
            key={t.key}
            className={`tab ${viewMode === t.key ? 'active' : ''}`}
            onClick={() => setViewMode(t.key)}
          >
            &gt; {t.label}
          </button>
        ))}
      </div>

      {/* CAMPAIGNS VIEW */}
      {viewMode === 'campaigns' && (
        <>
          {/* Charts row */}
          <section className="section grid-2">
            <div className="card animate-in">
              <div className="card-header"><h3>Spend vs Revenue (Top 10)</h3></div>
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
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: '#111', border: '1px solid #333', padding: '12px', fontSize: '11px', fontFamily: 'inherit' }}>
                              <p style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>{label}</p>
                              {payload.map((p, i) => (
                                <p key={i} style={{ color: p.color, margin: '2px 0' }}>
                                  {p.name}: {formatRupiah(p.value)}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="spend" name="Ad Spend" fill="#ff4444" radius={[2, 2, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="revenue" name="Komisi" fill="#00ff00" radius={[2, 2, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card animate-in animate-delay-1">
              <div className="card-header"><h3>Profit / Loss per Campaign</h3></div>
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
          </section>

          {/* Campaign Performance Table */}
          <section className="section">
            <h2 className="section-title">Performa Campaign — Analisis ROAS & Profit/Loss</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ maxHeight: 600, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {[
                        { key: 'campaignName', label: 'Campaign' },
                        { key: 'totalSpend', label: 'Spend' },
                        { key: 'totalClicks', label: 'Meta Klik' },
                        { key: 'shopeeClicks', label: 'Shopee Klik' },
                        { key: 'dropOff', label: 'Drop-off' },
                        { key: 'cpc', label: 'CPC' },
                        { key: 'ctr', label: 'CTR' },
                        { key: 'totalImpressions', label: 'Impr.' },
                        { key: 'matchedTagLink', label: 'TagLink' },
                        { key: 'revenue', label: 'Komisi' },
                        { key: 'roas', label: 'ROAS' },
                        { key: 'profitLoss', label: 'Profit/Loss' },
                        { key: 'status', label: 'Status' },
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
                    {sortedCrossRef.map((c, i) => {
                      const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.bep;
                      const metaKlik = c.totalClicks || 0;
                      const shopeeKlik = c.shopeeClicks || 0;
                      const dropOff = metaKlik > 0 && shopeeKlik > 0 ? ((metaKlik - shopeeKlik) / metaKlik * 100) : null;
                      const dropOffColor = dropOff === null ? 'var(--text-muted)'
                        : dropOff <= 0 ? 'var(--success)'
                        : dropOff < 25 ? '#00ff88'
                        : dropOff < 50 ? 'var(--warning)'
                        : '#ff4444';
                      return (
                        <tr
                          key={c.campaignName}
                          style={{ cursor: 'pointer' }}
                          onClick={() => onCampaignClick && onCampaignClick(c.campaignName)}
                        >
                          <td>
                            <span className="taglink-name" style={{ borderColor: '#555' }}>
                              {c.campaignName.replace(/\s*Setingan\s*New/gi, '').trim()}
                            </span>
                          </td>
                          <td style={{ color: '#ff6b6b', fontWeight: 600 }}>{formatRupiah(c.totalSpend)}</td>
                          {/* Meta Klik */}
                          <td>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                              {formatNumber(metaKlik)}
                            </span>
                          </td>
                          {/* Shopee Klik */}
                          <td>
                            {shopeeKlik > 0 ? (
                              <span className="shopee-klik-badge">
                                🛒 {formatNumber(shopeeKlik)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                            )}
                          </td>
                          {/* Drop-off */}
                          <td>
                            {dropOff !== null ? (
                              <div className="dropoff-cell">
                                <div className="dropoff-bar-track">
                                  <div
                                    className="dropoff-bar-fill"
                                    style={{
                                      width: `${Math.min(Math.abs(dropOff), 100)}%`,
                                      background: dropOffColor,
                                    }}
                                  />
                                </div>
                                <span style={{ color: dropOffColor, fontWeight: 700, fontSize: 11 }}>
                                  {dropOff > 0 ? '-' : '+'}{Math.abs(dropOff).toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                            )}
                          </td>
                          <td>{formatRupiah(c.cpc)}</td>
                          <td style={{ color: c.ctr > 5 ? 'var(--success)' : c.ctr > 2 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {formatPercent(c.ctr)}
                          </td>
                          <td className="text-muted">{formatNumber(c.totalImpressions)}</td>
                          <td>
                            {c.isMatched ? (
                              <span className="badge badge-channel" style={{ background: 'rgba(0,255,255,0.1)', color: 'var(--accent)', border: '1px solid rgba(0,255,255,0.3)' }}>
                                {c.matchedTagLink}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                            )}
                          </td>
                          <td style={{ color: c.revenue > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {c.revenue > 0 ? formatRupiah(c.revenue) : '—'}
                          </td>
                          <td>
                            <span style={{
                              color: c.roas >= 1 ? 'var(--success)' : c.roas > 0 ? 'var(--warning)' : 'var(--text-muted)',
                              fontWeight: 700,
                              fontSize: 13,
                            }}>
                              {c.revenue > 0 ? c.roas.toFixed(2) + 'x' : '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              color: c.profitLoss >= 0 ? 'var(--success)' : 'var(--danger)',
                              fontWeight: 700,
                            }}>
                              {c.profitLoss >= 0 ? '+' : ''}{formatRupiah(c.profitLoss)}
                            </span>
                          </td>
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
        </>
      )}

      {/* DAILY VIEW */}
      {viewMode === 'daily' && (
        <>
          {/* Daily Spend vs Commission Chart */}
          <section className="section">
            <div className="card animate-in">
              <div className="card-header"><h3>Ad Spend vs Komisi — Per Hari</h3></div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 8, right: 8, bottom: 40, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#888', fontSize: 10 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={false}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fill: '#888', fontSize: 10 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: '#111', border: '1px solid #333', padding: '12px', fontSize: '11px', fontFamily: 'inherit' }}>
                              <p style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>{label}</p>
                              {payload.map((p, i) => (
                                <p key={i} style={{ color: p.color, margin: '2px 0' }}>
                                  {p.name}: {formatRupiah(p.value)}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#888' }} />
                    <Bar dataKey="spend" name="Ad Spend" fill="#ff4444" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="commission" name="Komisi Shopee" fill="#00ff00" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Daily Breakdown Cards */}
          <section className="section">
            <h2 className="section-title">Breakdown Harian — Spend vs Komisi</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...dailyCrossRef].reverse().map(day => {
                const st = STATUS_CONFIG[day.status] || STATUS_CONFIG.bep;
                return (
                  <div key={day.date} className="daily-card" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div className="daily-date" style={{ marginBottom: 0 }}>
                        <span>📅 {formatDateShort(day.date)}</span>
                        <span className="day-name">{getDayName(day.date)}</span>
                      </div>
                      <span className={`badge-status badge-status-${day.status}`}>
                        {st.emoji} {st.label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                      {/* Ad Spend */}
                      <div>
                        <div className="daily-stat-label">💸 Ad Spend</div>
                        <div className="daily-stat-value" style={{ color: day.spend > 0 ? '#ff6b6b' : 'var(--text-muted)' }}>
                          {day.spend > 0 ? formatRupiah(day.spend) : '—'}
                        </div>
                      </div>
                      {/* Ad Clicks */}
                      <div>
                        <div className="daily-stat-label">🖱️ Ad Clicks</div>
                        <div className="daily-stat-value" style={{ color: 'var(--accent)' }}>
                          {day.adClicks > 0 ? formatNumber(day.adClicks) : '—'}
                        </div>
                      </div>
                      {/* Impressions */}
                      <div>
                        <div className="daily-stat-label">👁️ Impressions</div>
                        <div className="daily-stat-value">
                          {day.impressions > 0 ? formatNumber(day.impressions) : '—'}
                        </div>
                      </div>
                      {/* Orders */}
                      <div>
                        <div className="daily-stat-label">📦 Orders</div>
                        <div className="daily-stat-value" style={{ color: 'var(--accent)' }}>
                          {day.orders > 0 ? formatNumber(day.orders) : '—'}
                        </div>
                      </div>
                      {/* Commission */}
                      <div>
                        <div className="daily-stat-label">💰 Komisi</div>
                        <div className="daily-stat-value" style={{ color: day.commission > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {day.commission > 0 ? formatRupiah(day.commission) : '—'}
                        </div>
                      </div>
                      {/* ROAS */}
                      <div>
                        <div className="daily-stat-label">📈 ROAS</div>
                        <div className="daily-stat-value" style={{
                          color: day.roas >= 1 ? 'var(--success)' : day.roas > 0 ? 'var(--warning)' : 'var(--text-muted)',
                        }}>
                          {day.hasAds && day.hasCommission ? day.roas.toFixed(2) + 'x' : '—'}
                        </div>
                      </div>
                      {/* Profit/Loss */}
                      <div>
                        <div className="daily-stat-label">📊 Profit/Loss</div>
                        <div className="daily-stat-value" style={{
                          color: day.profitLoss >= 0 ? 'var(--success)' : 'var(--danger)',
                          fontWeight: 700,
                        }}>
                          {(day.hasAds || day.hasCommission)
                            ? (day.profitLoss >= 0 ? '+' : '') + formatRupiah(day.profitLoss)
                            : '—'
                          }
                        </div>
                      </div>
                      {/* Purchase Value */}
                      <div>
                        <div className="daily-stat-label">🛒 Penjualan</div>
                        <div className="daily-stat-value" style={{ color: 'var(--purple)' }}>
                          {day.purchaseValue > 0 ? formatRupiah(day.purchaseValue) : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Data source indicators */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                      {day.hasAds && (
                        <span style={{ fontSize: 10, color: '#ff6b6b', background: 'rgba(255,68,68,0.08)', padding: '2px 6px', border: '1px solid rgba(255,68,68,0.2)' }}>
                          META ADS: {day.campaigns} campaign
                        </span>
                      )}
                      {day.hasCommission && (
                        <span style={{ fontSize: 10, color: 'var(--success)', background: 'rgba(0,255,0,0.08)', padding: '2px 6px', border: '1px solid rgba(0,255,0,0.2)' }}>
                          SHOPEE: {day.orders} order · {day.items} item
                        </span>
                      )}
                      {!day.hasAds && !day.hasCommission && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tidak ada data</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* PLACEMENTS VIEW */}
      {viewMode === 'placements' && (
        <>
          <section className="section">
            <div className="card animate-in">
              <div className="card-header"><h3>Spend per Placement</h3></div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={placementChartData} margin={{ top: 8, right: 8, bottom: 60, left: 8 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#888', fontSize: 10 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#888', fontSize: 10 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: '#111', border: '1px solid #333', padding: '12px', fontSize: '11px', fontFamily: 'inherit' }}>
                              <p style={{ color: '#fff', fontWeight: 700 }}>{label}</p>
                              <p style={{ color: '#ff6b6b', margin: '4px 0' }}>Spend: {formatRupiah(payload[0].value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="spend" fill="#3b82f6" radius={[0, 2, 2, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">Breakdown per Placement</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Placement</th>
                      <th>Spend</th>
                      <th>Impressions</th>
                      <th>Reach</th>
                      <th>Clicks</th>
                      <th>CTR</th>
                      <th>CPC</th>
                      <th>CPM</th>
                      <th>% Total Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.map((p, i) => {
                      const spendPct = totalSpend > 0 ? (p.spend / totalSpend) * 100 : 0;
                      return (
                        <tr key={i}>
                          <td>
                            <span className={`badge badge-channel badge-${p.platform.toLowerCase()}`}>
                              {p.platform}
                            </span>
                          </td>
                          <td className="text-primary">{p.placement}</td>
                          <td style={{ color: '#ff6b6b', fontWeight: 600 }}>{formatRupiah(p.spend)}</td>
                          <td>{formatNumber(p.impressions)}</td>
                          <td>{formatNumber(p.reach)}</td>
                          <td className="text-primary">{formatNumber(p.clicks)}</td>
                          <td style={{ color: p.ctr > 5 ? 'var(--success)' : p.ctr > 2 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {formatPercent(p.ctr)}
                          </td>
                          <td>{formatRupiah(p.cpc)}</td>
                          <td>{formatRupiah(p.cpm)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="progress-bar" style={{ width: 80 }}>
                                <div className="progress-bar-fill" style={{ width: `${spendPct}%`, background: 'var(--accent)' }} />
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{spendPct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {/* PLATFORMS VIEW */}
      {viewMode === 'platforms' && (
        <section className="section">
          <h2 className="section-title">Performa per Platform</h2>
          <div className="meta-platform-grid">
            {platforms.map(p => {
              const spendPct = totalSpend > 0 ? (p.spend / totalSpend) * 100 : 0;
              const color = PLATFORM_COLORS[p.platform] || '#888';
              return (
                <div key={p.platform} className="card animate-in" style={{ borderColor: color, borderTopWidth: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: color }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{p.platform}</h3>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {spendPct.toFixed(1)}% of total
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Spend</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#ff6b6b' }}>{formatRupiah(p.spend)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Clicks</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color }}>{formatNumber(p.clicks)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Impressions</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{formatNumber(p.impressions)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>CPC</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{formatRupiah(p.cpc)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>CTR</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: p.ctr > 5 ? 'var(--success)' : p.ctr > 2 ? 'var(--warning)' : '#fff' }}>
                        {formatPercent(p.ctr)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Reach</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{formatNumber(p.reach)}</div>
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
