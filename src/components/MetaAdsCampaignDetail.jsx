'use client';

import { useMemo } from 'react';
import {
  formatRupiah,
  formatNumber,
  formatPercent,
  formatDateShort,
  getDayName,
  aggregateMetaAdsByCampaign,
  crossReferenceAdsWithCommission,
  crossReferenceCampaignDaily,
} from '@/lib/csvParser';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const PLACEMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#6366f1', '#14b8a6', '#f97316', '#ef4444'];

const STATUS_CONFIG = {
  cuan: { label: 'CUAN', emoji: '🟢', color: '#00ff00', bg: 'rgba(0,255,0,0.08)' },
  boncos: { label: 'BONCOS', emoji: '🔴', color: '#ff0000', bg: 'rgba(255,0,0,0.08)' },
  bep: { label: 'BEP', emoji: '🟡', color: '#ffb000', bg: 'rgba(255,176,0,0.08)' },
};

export default function MetaAdsCampaignDetail({ campaignName, metaAdsData, tagLinkData, commissionData, onBack }) {
  const campaigns = useMemo(() => aggregateMetaAdsByCampaign(metaAdsData), [metaAdsData]);
  
  const campaign = useMemo(() => {
    const all = tagLinkData && tagLinkData.length > 0
      ? crossReferenceAdsWithCommission(campaigns, tagLinkData)
      : campaigns.map(c => ({ ...c, revenue: 0, purchaseValue: 0, orders: 0, roas: 0, roi: 0, profitLoss: -c.totalSpend, status: 'boncos', matchedTagLink: null, isMatched: false }));
    return all.find(c => c.campaignName === campaignName);
  }, [campaignName, campaigns, tagLinkData]);

  const dailyData = useMemo(() => {
    if (!commissionData || commissionData.length === 0) return [];
    return crossReferenceCampaignDaily(campaignName, metaAdsData, commissionData);
  }, [campaignName, metaAdsData, commissionData]);

  if (!campaign) {
    return (
      <div className="empty-state" style={{ minHeight: '50vh' }}>
        <div className="empty-icon">📊</div>
        <h3>Campaign tidak ditemukan</h3>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: 16 }}>
          ← Kembali
        </button>
      </div>
    );
  }

  const st = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.bep;
  const displayName = campaign.campaignName.replace(/\s*Setingan\s*New/gi, '').trim();

  // Placement chart data
  const placementChart = campaign.placements.map((p, i) => ({
    name: `${p.platform} ${p.placement}`,
    shortName: p.placement,
    value: Math.round(p.spend),
    clicks: p.clicks,
    cpc: p.cpc,
    ctr: p.ctr,
    color: PLACEMENT_COLORS[i % PLACEMENT_COLORS.length],
  }));

  // Spend vs Revenue comparison
  const comparisonData = [
    { name: 'Ad Spend', value: Math.round(campaign.totalSpend), color: '#ff4444' },
    { name: 'Komisi', value: Math.round(campaign.revenue), color: '#00ff00' },
  ];

  return (
    <div className="animate-in">
      <button onClick={onBack} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        ← Kembali ke Meta Ads
      </button>

      <header className="page-header" style={{ borderBottom: 'none', padding: '8px 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 20, color: 'var(--text-primary)' }}>📊 {displayName}</h2>
          <span className={`badge-status badge-status-${campaign.status}`} style={{ fontSize: 13 }}>
            {st.emoji} {st.label}
          </span>
        </div>
        <p className="page-meta">
          Budget: {formatRupiah(campaign.budget)}/{campaign.budgetType} · 
          {campaign.placements.length} placement · 
          Tanggal: {campaign.reportDate}
        </p>
      </header>

      {/* KPI Cards */}
      <section className="section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div className="summary-card accent-cyan">
            <div className="card-label">Ad Spend</div>
            <div className="card-value" style={{ color: '#ff6b6b', fontSize: 18 }}>{formatRupiah(campaign.totalSpend)}</div>
          </div>
          <div className="summary-card accent-green">
            <div className="card-label">Komisi Shopee</div>
            <div className="card-value" style={{ color: campaign.revenue > 0 ? 'var(--success)' : 'var(--text-muted)', fontSize: 18 }}>
              {campaign.revenue > 0 ? formatRupiah(campaign.revenue) : '—'}
            </div>
          </div>
          <div className="summary-card" style={{ borderColor: st.color, background: st.bg }}>
            <div className="card-label">Profit / Loss</div>
            <div className="card-value" style={{ color: st.color, fontSize: 18 }}>
              {campaign.profitLoss >= 0 ? '+' : ''}{formatRupiah(campaign.profitLoss)}
            </div>
          </div>
          <div className="summary-card accent-purple">
            <div className="card-label">ROAS</div>
            <div className="card-value" style={{
              color: campaign.roas >= 1 ? 'var(--success)' : campaign.roas > 0 ? 'var(--warning)' : 'var(--text-muted)',
              fontSize: 18,
            }}>
              {campaign.revenue > 0 ? campaign.roas.toFixed(2) + 'x' : '—'}
            </div>
          </div>
          <div className="summary-card accent-orange">
            <div className="card-label">ROI</div>
            <div className="card-value" style={{
              color: campaign.roi >= 0 ? 'var(--success)' : 'var(--danger)',
              fontSize: 18,
            }}>
              {campaign.revenue > 0 ? (campaign.roi >= 0 ? '+' : '') + campaign.roi.toFixed(1) + '%' : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Ad Performance Metrics */}
      <section className="section grid-2">
        <div className="card">
          <div className="card-header"><h3>Metrik Iklan</h3></div>
          <div className="stat-row">
            <span className="stat-label">Impressions</span>
            <span className="stat-value">{formatNumber(campaign.totalImpressions)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Reach</span>
            <span className="stat-value">{formatNumber(campaign.totalReach)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Link Clicks</span>
            <span className="stat-value" style={{ color: 'var(--accent)' }}>{formatNumber(campaign.totalClicks)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">CTR</span>
            <span className="stat-value" style={{
              color: campaign.ctr > 5 ? 'var(--success)' : campaign.ctr > 2 ? 'var(--warning)' : 'var(--text-muted)'
            }}>
              {formatPercent(campaign.ctr)}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">CPC (Cost per Click)</span>
            <span className="stat-value">{formatRupiah(campaign.cpc)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">CPM (Cost per 1K Impr.)</span>
            <span className="stat-value">{formatRupiah(campaign.cpm)}</span>
          </div>
          {campaign.isMatched && (
            <>
              <div className="stat-row" style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 12 }}>
                <span className="stat-label">Matched TagLink</span>
                <span className="stat-value" style={{ color: 'var(--accent)' }}>{campaign.matchedTagLink}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Orders (Shopee)</span>
                <span className="stat-value">{formatNumber(campaign.orders)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Purchase Value</span>
                <span className="stat-value">{formatRupiah(campaign.purchaseValue)}</span>
              </div>
            </>
          )}
        </div>

        {/* Spend vs Revenue Chart */}
        <div className="card">
          <div className="card-header"><h3>Spend vs Revenue</h3></div>
          <div className="chart-wrapper-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: '#333' }} tickLine={false} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={{ stroke: '#333' }} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ background: '#111', border: '1px solid #333', padding: '12px', fontSize: '11px' }}>
                          <p style={{ color: '#fff', fontWeight: 700 }}>{payload[0].payload.name}</p>
                          <p style={{ color: payload[0].payload.color, marginTop: 4, fontWeight: 700 }}>{formatRupiah(payload[0].value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {comparisonData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Daily Breakdown */}
      {dailyData.length > 0 && (
        <section className="section">
          <h2 className="section-title">Breakdown Harian</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Spend</th>
                    <th>Clicks</th>
                    <th>Impr.</th>
                    <th>Orders</th>
                    <th>Komisi</th>
                    <th>ROAS</th>
                    <th>Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dailyData].reverse().map((d, i) => {
                    const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.bep;
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateShort(d.date)}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{getDayName(d.date)}</span>
                          </div>
                        </td>
                        <td style={{ color: d.spend > 0 ? '#ff6b6b' : 'var(--text-muted)', fontWeight: 600 }}>
                          {d.spend > 0 ? formatRupiah(d.spend) : '—'}
                        </td>
                        <td className="text-primary">{d.adClicks > 0 ? formatNumber(d.adClicks) : '—'}</td>
                        <td className="text-muted">{d.impressions > 0 ? formatNumber(d.impressions) : '—'}</td>
                        <td style={{ color: 'var(--accent)' }}>{d.orders > 0 ? formatNumber(d.orders) : '—'}</td>
                        <td style={{ color: d.commission > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {d.commission > 0 ? formatRupiah(d.commission) : '—'}
                        </td>
                        <td style={{
                          color: d.roas >= 1 ? 'var(--success)' : d.roas > 0 ? 'var(--warning)' : 'var(--text-muted)',
                          fontWeight: 700
                        }}>
                          {d.hasAds && d.hasCommission ? d.roas.toFixed(2) + 'x' : '—'}
                        </td>
                        <td style={{ color: d.profitLoss >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                          {(d.hasAds || d.hasCommission) ? (d.profitLoss >= 0 ? '+' : '') + formatRupiah(d.profitLoss) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Placement Breakdown */}
      <section className="section">
        <h2 className="section-title">Breakdown per Placement</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Platform</th>
                  <th>Placement</th>
                  <th>Spend</th>
                  <th>Impressions</th>
                  <th>Reach</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>CPC</th>
                  <th>% Spend</th>
                </tr>
              </thead>
              <tbody>
                {campaign.placements.map((p, i) => {
                  const pctSpend = campaign.totalSpend > 0 ? (p.spend / campaign.totalSpend) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td><span className={`rank ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span></td>
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
                      <td>{p.clicks > 0 ? formatRupiah(p.cpc) : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar" style={{ width: 60 }}>
                            <div className="progress-bar-fill" style={{
                              width: `${pctSpend}%`,
                              background: PLACEMENT_COLORS[i % PLACEMENT_COLORS.length],
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pctSpend.toFixed(1)}%</span>
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

      {/* Placement Distribution Chart */}
      {placementChart.length > 0 && (
        <section className="section">
          <div className="card">
            <div className="card-header"><h3>Distribusi Spend per Placement</h3></div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={placementChart} margin={{ top: 8, right: 8, bottom: 60, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="shortName"
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
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: '#111', border: '1px solid #333', padding: '12px', fontSize: '11px' }}>
                            <p style={{ color: '#fff', fontWeight: 700 }}>{d.name}</p>
                            <p style={{ color: '#ff6b6b', margin: '4px 0' }}>Spend: {formatRupiah(d.value)}</p>
                            <p style={{ color: 'var(--accent)' }}>Clicks: {formatNumber(d.clicks)}</p>
                            <p style={{ color: '#888' }}>CPC: {formatRupiah(d.cpc)} · CTR: {formatPercent(d.ctr)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={32}>
                    {placementChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
