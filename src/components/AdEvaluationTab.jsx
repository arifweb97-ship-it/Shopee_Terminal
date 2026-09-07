'use client';

import { useMemo, useState } from 'react';
import {
  formatRupiah,

  formatDateShort,
  aggregateMetaAdsByCampaign,
  crossReferenceAdsWithCommission,
  crossReferenceCampaignDaily,
  evaluateCampaignPerformance,
} from '@/lib/csvParser';

const VERDICT_CONFIG = {
  profit: { label: 'PROFIT', emoji: '🟢', color: '#00ff00', bg: 'rgba(0,255,0,0.08)', border: 'rgba(0,255,0,0.3)' },
  boncos: { label: 'BONCOS', emoji: '🔴', color: '#ff3d57', bg: 'rgba(255,61,87,0.08)', border: 'rgba(255,61,87,0.3)' },
  bep: { label: 'BEP', emoji: '🟡', color: '#ffb000', bg: 'rgba(255,176,0,0.08)', border: 'rgba(255,176,0,0.3)' },
};

const RECOMMENDATION_CONFIG = {
  scale: { label: '🚀 SCALE UP', color: '#00ff00', bg: 'rgba(0,255,0,0.1)', border: 'rgba(0,255,0,0.4)', text: 'Tingkatkan budget' },
  monitor: { label: '⚠️ MONITOR', color: '#ffb000', bg: 'rgba(255,176,0,0.1)', border: 'rgba(255,176,0,0.4)', text: 'Pantau performa' },
  kill: { label: '🛑 MATIKAN', color: '#ff3d57', bg: 'rgba(255,61,87,0.1)', border: 'rgba(255,61,87,0.4)', text: 'Stop campaign' },
};

// Mini Circular score ring
function ScoreRing({ score, size = 32 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#00ff00' : score >= 40 ? '#ffb000' : '#ff3d57';

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }} title={`Skor Kinerja: ${score}/100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace",
      }}>
        {score}
      </div>
    </div>
  );
}

export default function AdEvaluationTab({ metaAdsData = [], tagLinkData = [], commissionData = [], onCampaignClick }) {
  const [filterMode, setFilterMode] = useState('all'); // all | 3plus | pending | profit | boncos | bep | scale | kill
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [sortField, setSortField] = useState('profitLoss');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const MIN_DAYS = 3;

  // 1. Calculate the TRUE global last upload date from both Meta Ads AND Commission Data
  const globalLastDate = useMemo(() => {
    const dates = new Set();
    metaAdsData.forEach(r => {
      if (r.reportStart) dates.add(r.reportStart.split(' ')[0]);
      if (r.reportEnd) dates.add(r.reportEnd.split(' ')[0]);
    });
    commissionData.forEach(r => {
      if (r.orderTime) dates.add(r.orderTime.split(' ')[0]);
    });
    const sorted = [...dates].sort();
    return sorted.length > 0 ? sorted[sorted.length - 1] : '';
  }, [metaAdsData, commissionData]);

  // 2. Aggregate Meta Ads campaigns
  const rawCampaigns = useMemo(() => aggregateMetaAdsByCampaign(metaAdsData), [metaAdsData]);

  // Recalculate duration using the absolute global last date across both sources
  const campaigns = useMemo(() => {
    const parseUtcDate = (dStr) => {
      if (!dStr) return null;
      const m = String(dStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    };
    const endDate = parseUtcDate(globalLastDate);

    return rawCampaigns.map(c => {
      let durationDays = c.durationDays || 1;
      const startDate = parseUtcDate(c.campaignStartDate);
      if (startDate && endDate) {
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        durationDays = Math.max(1, diffDays + 1);
      }
      return {
        ...c,
        durationDays,
        globalLastDate,
      };
    });
  }, [rawCampaigns, globalLastDate]);

  // 3. Cross reference with Shopee commission data
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

  // 4. Daily cross reference function for expanded rows
  const getCampaignDaily = (campaignName) => {
    if (!commissionData || commissionData.length === 0) return [];
    return crossReferenceCampaignDaily(campaignName, metaAdsData, commissionData);
  };

  // 5. Evaluate all campaigns
  const allEvaluated = useMemo(() => {
    return crossRef.map(c => {
      const dailyData = getCampaignDaily(c.campaignName);
      const evaluation = evaluateCampaignPerformance(c, dailyData);
      const is3Plus = c.durationDays >= MIN_DAYS;
      return { ...c, evaluation, dailyData, is3Plus };
    });
  }, [crossRef, metaAdsData, commissionData]);

  // Summary statistics
  const totalCampaigns = allEvaluated.length;
  const count3Plus = allEvaluated.filter(c => c.is3Plus).length;
  const countPending = allEvaluated.filter(c => !c.is3Plus).length;
  const countProfit = allEvaluated.filter(c => c.evaluation.verdict === 'profit').length;
  const countBoncos = allEvaluated.filter(c => c.evaluation.verdict === 'boncos').length;
  const countBep = allEvaluated.filter(c => c.evaluation.verdict === 'bep').length;
  const countScale = allEvaluated.filter(c => c.evaluation.recommendation === 'scale').length;
  const countKill = allEvaluated.filter(c => c.evaluation.recommendation === 'kill').length;

  const totalSpend = allEvaluated.reduce((sum, c) => sum + (c.totalSpend || 0), 0);
  const totalCommission = allEvaluated.reduce((sum, c) => sum + (c.evaluation.revenue || 0), 0);
  const totalProfitLoss = totalCommission - totalSpend;
  const overallRoas = totalSpend > 0 ? totalCommission / totalSpend : 0;

  // Filter & Search
  const filtered = useMemo(() => {
    return allEvaluated.filter(c => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = c.campaignName.toLowerCase().includes(q);
        const matchTag = (c.matchedTagLink || '').toLowerCase().includes(q);
        if (!matchName && !matchTag) return false;
      }

      // Start Date filter
      if (startDateFilter) {
        if (!c.campaignStartDate) return false;
        const d = new Date(c.campaignStartDate);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          if (`${yyyy}-${mm}-${dd}` !== startDateFilter) return false;
        } else {
          if (!c.campaignStartDate.startsWith(startDateFilter)) return false;
        }
      }

      // Mode filter
      if (filterMode === '3plus') return c.is3Plus;
      if (filterMode === 'pending') return !c.is3Plus;
      if (filterMode === 'profit') return c.evaluation.verdict === 'profit';
      if (filterMode === 'boncos') return c.evaluation.verdict === 'boncos';
      if (filterMode === 'bep') return c.evaluation.verdict === 'bep';
      if (filterMode === 'scale') return c.evaluation.recommendation === 'scale';
      if (filterMode === 'kill') return c.evaluation.recommendation === 'kill';
      return true;
    });
  }, [allEvaluated, filterMode, searchQuery]);

  // Sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getSortArrow = (field) => {
    if (sortField !== field) return ' ⇅';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va, vb;
      switch (sortField) {
        case 'score': va = a.evaluation.score; vb = b.evaluation.score; break;
        case 'profitLoss': va = a.evaluation.profitLoss; vb = b.evaluation.profitLoss; break;
        case 'roas': va = a.evaluation.roas; vb = b.evaluation.roas; break;
        case 'durationDays': va = a.durationDays; vb = b.durationDays; break;
        case 'totalSpend': va = a.totalSpend; vb = b.totalSpend; break;
        case 'revenue': va = a.evaluation.revenue; vb = b.evaluation.revenue; break;
        case 'dailyAvgProfit': va = a.evaluation.dailyAvgProfit; vb = b.evaluation.dailyAvgProfit; break;
        case 'campaignName': va = a.campaignName; vb = b.campaignName; break;
        default: va = a.evaluation.profitLoss; vb = b.evaluation.profitLoss;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [filtered, sortField, sortDir]);

  if (totalCampaigns === 0) {
    return (
      <div className="eval-empty-state">
        <div className="eval-empty-icon">📊</div>
        <h3>Belum Ada Data Meta Ads</h3>
        <p>Silakan upload file CSV Meta Ads untuk memulai evaluasi performa campaign.</p>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ===== EXPLANATION & PERIOD BANNER ===== */}
      <div className="eval-info-banner">
        <div className="eval-info-banner-left">
          <span className="eval-info-icon">💡</span>
          <div>
            <div className="eval-info-title">
              Hitungan Evaluasi Iklan Terhubung Shopee
            </div>
            <div className="eval-info-text">
              Durasi dihitung dari tanggal iklan mulai aktif (<strong>Starts</strong>) sampai tanggal report terakhir yang di-upload ({' '}
              <span className="eval-highlight-date">{formatDateShort(globalLastDate) || 'Terbaru'}</span>
              ). Contoh: Mulai 5 Sep & upload s/d 7 Sep = dihitung <strong>3 hari</strong>.
            </div>
          </div>
        </div>
        <div className="eval-info-banner-right">
          <span className="eval-badge-matched-info">
            {tagLinkData.length > 0 ? `🔗 ${tagLinkData.length} TagLink Shopee Terhubung` : '⚠️ CSV Shopee belum di-upload'}
          </span>
        </div>
      </div>

      {/* ===== SUMMARY METRIC CARDS ===== */}
      <section className="eval-stats-grid">
        {/* Total Spend */}
        <div className="eval-stat-box">
          <div className="eval-stat-label">TOTAL SPEND META ADS</div>
          <div className="eval-stat-val text-red">{formatRupiah(totalSpend)}</div>
          <div className="eval-stat-desc">{totalCampaigns} Campaign aktif</div>
        </div>

        {/* Total Komisi Shopee */}
        <div className="eval-stat-box">
          <div className="eval-stat-label">KOMISI SHOPEE (CROSS-REF)</div>
          <div className="eval-stat-val text-green">{formatRupiah(totalCommission)}</div>
          <div className="eval-stat-desc">
            {tagLinkData.length > 0 ? `Matched dengan Shopee TagLink` : 'Upload Shopee CSV untuk match'}
          </div>
        </div>

        {/* Net Profit / Loss */}
        <div className={`eval-stat-box ${totalProfitLoss >= 0 ? 'eval-box-profit' : 'eval-box-boncos'}`}>
          <div className="eval-stat-label">NET PROFIT / LOSS</div>
          <div className={`eval-stat-val ${totalProfitLoss >= 0 ? 'text-green' : 'text-red'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}{formatRupiah(totalProfitLoss)}
          </div>
          <div className="eval-stat-desc">
            ROAS Keseluruhan: <strong>{overallRoas.toFixed(2)}x</strong>
          </div>
        </div>

        {/* Durasi & Kesiapan */}
        <div className="eval-stat-box">
          <div className="eval-stat-label">STATUS DURASI IKLAN</div>
          <div className="eval-stat-val" style={{ color: 'var(--accent)' }}>
            {count3Plus} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {totalCampaigns}</span>
          </div>
          <div className="eval-stat-desc">
            <span style={{ color: '#00ff00' }}>{count3Plus} siap evaluasi (3+ hari)</span> · <span style={{ color: '#ffb000' }}>{countPending} masa uji</span>
          </div>
        </div>
      </section>

      {/* ===== FILTER CHIPS & SEARCH ===== */}
      <div className="eval-filter-container">
        <div className="eval-chips-scroll">
          {[
            { id: 'all', label: 'Semua Campaign', count: totalCampaigns },
            { id: '3plus', label: '🎯 Siap Evaluasi (3+ Hari)', count: count3Plus, highlight: '#00e5ff' },
            { id: 'pending', label: '⏳ Baru Mulai (< 3 Hari)', count: countPending, highlight: '#ffb000' },
            { id: 'profit', label: '🟢 Profit', count: countProfit, highlight: '#00ff00' },
            { id: 'boncos', label: '🔴 Boncos', count: countBoncos, highlight: '#ff3d57' },
            { id: 'bep', label: '🟡 BEP', count: countBep, highlight: '#ffb000' },
            { id: 'scale', label: '🚀 Scale Up', count: countScale },
            { id: 'kill', label: '🛑 Matikan', count: countKill },
          ].map(chip => (
            <button
              key={chip.id}
              className={`eval-pill-btn ${filterMode === chip.id ? 'active' : ''}`}
              onClick={() => setFilterMode(chip.id)}
            >
              {chip.label}
              <span className="eval-pill-count">{chip.count}</span>
            </button>
          ))}
        </div>

        <div className="eval-search-wrap" style={{ display: 'flex', gap: '8px' }}>
          <div className="eval-date-filter" style={{ position: 'relative', width: '135px' }}>
            <span className="eval-search-icon">📅</span>
            <input
              type="date"
              className="eval-search-input eval-date-input"
              style={{ paddingLeft: '30px', paddingRight: startDateFilter ? '28px' : '10px' }}
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              title="Filter dari Tanggal Mulai Iklan"
            />
            {startDateFilter && (
              <button className="eval-search-clear" style={{ zIndex: 10 }} onClick={() => setStartDateFilter('')}>✕</button>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <span className="eval-search-icon">🔍</span>
            <input
              type="text"
              className="eval-search-input"
              placeholder="Cari campaign / taglink..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="eval-search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ===== EVALUATION TABLE (DAFTAR UTAMA) ===== */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.5px' }}>
              DAFTAR EVALUASI CAMPAIGN
            </h3>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
              Menampilkan {sorted.length} dari {totalCampaigns} Campaign
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Klik kolom untuk sort · Klik baris untuk lihat rincian harian
          </div>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <div className="eval-table" style={{ minWidth: 1050 }}>
            <div className="eval-row-main" style={{ 
              borderBottom: '1px solid var(--border-color)', 
              color: 'var(--text-muted)', 
              fontSize: 11, 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              paddingTop: 14,
              paddingBottom: 14
            }}>
              <div style={{ width: 40, textAlign: 'center' }}>#</div>
              <div style={{ width: 50, textAlign: 'center' }} onClick={() => handleSort('score')} className="sortable-th">
                Skor {getSortArrow('score')}
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 180 }} onClick={() => handleSort('campaignName')} className="sortable-th">
                Campaign & TagLink {getSortArrow('campaignName')}
              </div>
              <div style={{ width: 90, textAlign: 'center' }}>Mulai Iklan</div>
              <div style={{ width: 140, textAlign: 'center' }} onClick={() => handleSort('durationDays')} className="sortable-th">
                Durasi {getSortArrow('durationDays')}
              </div>
              <div style={{ width: 110, textAlign: 'right' }} onClick={() => handleSort('totalSpend')} className="sortable-th">
                Biaya Meta Ads {getSortArrow('totalSpend')}
              </div>
              <div style={{ width: 110, textAlign: 'right' }} onClick={() => handleSort('revenue')} className="sortable-th">
                Komisi {getSortArrow('revenue')}
              </div>
              <div style={{ width: 120, textAlign: 'right' }} onClick={() => handleSort('profitLoss')} className="sortable-th">
                Profit / Rugi {getSortArrow('profitLoss')}
              </div>
              <div style={{ width: 70, textAlign: 'center' }} onClick={() => handleSort('roas')} className="sortable-th">
                ROAS {getSortArrow('roas')}
              </div>
              <div style={{ width: 95, textAlign: 'center' }}>Status</div>
              <div style={{ width: 110, textAlign: 'center' }}>Aksi</div>
              <div style={{ width: 50, textAlign: 'center' }}>Detail</div>
            </div>
            <div>
              {sorted.map((c, idx) => {
                const ev = c.evaluation;
                const vCfg = VERDICT_CONFIG[ev.verdict] || VERDICT_CONFIG.bep;
                const rCfg = RECOMMENDATION_CONFIG[ev.recommendation] || RECOMMENDATION_CONFIG.monitor;
                const isExpanded = expandedCampaign === c.campaignName;
                const cleanName = c.campaignName.replace(/\s*Setingan\s*New/gi, '').trim();

                return (
                  <div key={c.campaignName} className={`eval-table-row ${isExpanded ? 'row-expanded' : ''}`}>
                    <div style={{ padding: 0 }}>
                      <div
                        className="eval-row-main"
                        onClick={() => setExpandedCampaign(isExpanded ? null : c.campaignName)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* 1. Index */}
                        <div style={{ width: 40, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                          {idx + 1}
                        </div>

                        {/* 2. Score */}
                        <div style={{ width: 50, display: 'flex', justifyContent: 'center' }}>
                          <ScoreRing score={ev.score} size={30} />
                        </div>

                        {/* 3. Campaign & TagLink */}
                        <div style={{ flex: '1 1 200px', minWidth: 180, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
                            {cleanName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {c.isMatched ? (
                              <span className="eval-taglink-matched" title="Cocok dengan TagLink Shopee">
                                🔗 {c.matchedTagLink}
                              </span>
                            ) : (
                              <span className="eval-taglink-unmatched" title="Belum ditemukan transaksi dengan tag ini di CSV Shopee">
                                ⚠️ Belum Match Shopee
                              </span>
                            )}
                            {c.orders > 0 && (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                ({c.orders} order)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4. Mulai Iklan */}
                        <div style={{ width: 90, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                          {c.campaignStartDate ? formatDateShort(c.campaignStartDate) : '—'}
                        </div>

                        {/* 5. Durasi Terhitung */}
                        <div style={{ width: 140, textAlign: 'center' }}>
                          <span className={`eval-duration-pill ${c.is3Plus ? 'duration-3plus' : 'duration-pending'}`}>
                            {c.is3Plus ? `✅ ${c.durationDays} Hari` : `⏱ ${c.durationDays} Hari`}
                          </span>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                            {c.is3Plus ? 'Siap Evaluasi' : `Testing (+${MIN_DAYS - c.durationDays}d lagi)`}
                          </div>
                        </div>

                        {/* 6. Biaya Meta Ads */}
                        <div style={{ width: 110, textAlign: 'right', fontWeight: 600, color: '#ff6b6b', fontSize: 12 }}>
                          {formatRupiah(c.totalSpend)}
                        </div>

                        {/* 7. Komisi Shopee */}
                        <div style={{ width: 110, textAlign: 'right', fontWeight: 600, color: ev.revenue > 0 ? '#00ff00' : 'var(--text-muted)', fontSize: 12 }}>
                          {ev.revenue > 0 ? formatRupiah(ev.revenue) : 'Rp 0'}
                        </div>

                        {/* 8. Net Profit / Rugi */}
                        <div style={{ width: 120, textAlign: 'right' }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: 12,
                            color: ev.profitLoss >= 0 ? '#00ff00' : '#ff3d57',
                          }}>
                            {ev.profitLoss >= 0 ? '+' : ''}{formatRupiah(ev.profitLoss)}
                          </span>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                            {c.durationDays > 0 ? `${formatRupiah(Math.round(ev.dailyAvgProfit))}/hari` : ''}
                          </div>
                        </div>

                        {/* 9. ROAS */}
                        <div style={{ width: 70, textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: 11,
                            color: ev.roas >= 1.2 ? '#00ff00' : ev.roas >= 0.8 ? '#ffb000' : 'var(--text-muted)',
                          }}>
                            {ev.revenue > 0 ? `${ev.roas.toFixed(2)}x` : '0x'}
                          </span>
                        </div>

                        {/* 10. Status Evaluasi */}
                        <div style={{ width: 95, textAlign: 'center' }}>
                          <span
                            className="eval-verdict-tag"
                            style={{ background: vCfg.bg, color: vCfg.color, borderColor: vCfg.border }}
                          >
                            {vCfg.emoji} {vCfg.label}
                          </span>
                        </div>

                        {/* 11. Rekomendasi Aksi */}
                        <div style={{ width: 110, textAlign: 'center' }}>
                          <span
                            className="eval-rec-tag"
                            style={{ background: rCfg.bg, color: rCfg.color, borderColor: rCfg.border }}
                          >
                            {rCfg.label}
                          </span>
                        </div>

                        {/* 12. Detail Toggle */}
                        <div style={{ width: 50, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                          {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>

                      {/* ===== EXPANDABLE ACCORDION SECTION ===== */}
                      {isExpanded && (
                        <div className="eval-expand-container animate-in">
                          <div className="eval-expand-grid">
                            {/* Rekomendasi detail card */}
                            <div className="eval-expand-box">
                              <div className="eval-expand-box-title">💡 ANALISIS & REKOMENDASI</div>
                              <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '6px 0 10px 0', lineHeight: 1.5 }}>
                                {ev.recommendationDetail}
                              </p>
                              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span>Trend: <strong style={{ color: 'var(--text-primary)' }}>{ev.trend === 'improving' ? '↗ Membaik' : ev.trend === 'declining' ? '↘ Menurun' : '→ Stabil'}</strong></span>
                                <span>Rata-rata Spend: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(Math.round(ev.dailyAvgSpend))}/hari</strong></span>
                                <span>Rata-rata Komisi: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(Math.round(ev.dailyAvgRevenue))}/hari</strong></span>
                              </div>
                              <button
                                className="eval-detail-btn"
                                onClick={(e) => { e.stopPropagation(); onCampaignClick?.(c.campaignName); }}
                              >
                                Buka Analisis Lengkap Campaign Ini ➔
                              </button>
                            </div>

                            {/* Breakdown harian */}
                            <div className="eval-expand-box">
                              <div className="eval-expand-box-title">📅 PERFORMA HARIAN</div>
                              {c.dailyData && c.dailyData.length > 0 ? (
                                <table className="eval-mini-table">
                                  <thead>
                                    <tr>
                                      <th>Tanggal</th>
                                      <th style={{ textAlign: 'right' }}>Spend</th>
                                      <th style={{ textAlign: 'right' }}>Komisi</th>
                                      <th style={{ textAlign: 'right' }}>P/L</th>
                                      <th style={{ textAlign: 'center' }}>ROAS</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {c.dailyData.map(d => (
                                      <tr key={d.date}>
                                        <td>{formatDateShort(d.date)}</td>
                                        <td style={{ textAlign: 'right', color: '#ff6b6b' }}>{formatRupiah(d.spend)}</td>
                                        <td style={{ textAlign: 'right', color: d.commission > 0 ? '#00ff00' : 'var(--text-muted)' }}>
                                          {d.commission > 0 ? formatRupiah(d.commission) : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', color: d.profitLoss >= 0 ? '#00ff00' : '#ff3d57', fontWeight: 700 }}>
                                          {d.profitLoss >= 0 ? '+' : ''}{formatRupiah(d.profitLoss)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          {d.spend > 0 && d.commission > 0 ? `${(d.commission / d.spend).toFixed(2)}x` : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '12px 0' }}>
                                  Data harian Shopee belum match dengan campaign ini atau hanya ada 1 hari data report.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
