'use client';

import { useMemo, useState } from 'react';
import { formatRupiah, formatNumber, formatDateShort, getDayName } from '@/lib/csvParser';

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get the min order time date from ALL data (not just completed)
function getDataCoverage(data) {
  const orderDates = data
    .map(r => r.orderTime?.split(' ')[0])
    .filter(Boolean)
    .sort();
  return {
    minOrder: orderDates[0] || null,
    maxOrder: orderDates[orderDates.length - 1] || null,
  };
}

export default function CompletedOrdersSection({ data }) {
  const [expandedDate, setExpandedDate] = useState(null);
  const [showPartial, setShowPartial] = useState(true);

  const todayStr = getTodayStr();

  const completedByDate = useMemo(() => {
    const map = {};
    data
      .filter(r => r.affiliateStatus === 'Completed' && r.completeTime)
      .forEach(row => {
        const date = row.completeTime.split(' ')[0];
        if (!date) return;
        if (!map[date]) {
          map[date] = {
            date,
            orders: new Set(),
            items: 0,
            totalCommission: 0,
            totalAffiliateComm: 0,
            totalPurchaseValue: 0,
            tagLinks: {},
          };
        }
        const entry = map[date];
        entry.orders.add(row.orderId);
        entry.items += 1;
        entry.totalCommission += row.itemTotalComm;   // ✅ per-item, always correct
        entry.totalAffiliateComm += row.itemTotalComm; // affiliateNetComm hanya ada di baris pertama per order!
        entry.totalPurchaseValue += row.purchaseValue;

        const tag = row.tagLink1 || 'Unknown';
        if (!entry.tagLinks[tag]) {
          entry.tagLinks[tag] = { orders: new Set(), items: 0, commission: 0, affiliateComm: 0, purchaseValue: 0 };
        }
        entry.tagLinks[tag].orders.add(row.orderId);
        entry.tagLinks[tag].items += 1;
        entry.tagLinks[tag].commission += row.itemTotalComm;
        entry.tagLinks[tag].affiliateComm += row.itemTotalComm;
        entry.tagLinks[tag].purchaseValue += row.purchaseValue;
      });

    return Object.values(map)
      .map(entry => ({
        ...entry,
        orders: entry.orders.size,
        tagLinks: Object.entries(entry.tagLinks)
          .map(([name, d]) => ({
            name,
            orders: d.orders.size,
            items: d.items,
            commission: d.commission,
            affiliateComm: d.affiliateComm,
            purchaseValue: d.purchaseValue,
          }))
          .sort((a, b) => b.commission - a.commission),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  // ===== SMART DETECTION =====
  // The LATEST date in data = potentially partial (data may have been
  // exported mid-day, so that day's orders are incomplete).
  const latestDate = completedByDate.length > 0 ? completedByDate[0].date : null;

  // A date is "partial" if it's either today OR the max date in the dataset
  // AND has fewer items than the previous day's average (or simply = latest date)
  const isPartialDate = (date) => {
    if (!latestDate) return false;
    if (date === todayStr) return true;
    // Also flag the latest date if it = today or is the absolute max date
    if (date === latestDate && latestDate >= todayStr) return true;
    return false;
  };

  const partialDates = completedByDate.filter(d => isPartialDate(d.date));
  const confirmedDates = completedByDate.filter(d => !isPartialDate(d.date));

  // Totals — CONFIRMED only (pasti cair)
  const confirmedTotalComm = confirmedDates.reduce((s, d) => s + d.totalCommission, 0);
  const confirmedTotalAffiliateComm = confirmedDates.reduce((s, d) => s + d.totalAffiliateComm, 0);
  const confirmedTotalOrders = confirmedDates.reduce((s, d) => s + d.orders, 0);
  const confirmedTotalPV = confirmedDates.reduce((s, d) => s + d.totalPurchaseValue, 0);

  // Partial totals (estimasi)
  const partialTotalAffiliateComm = partialDates.reduce((s, d) => s + d.totalAffiliateComm, 0);
  const partialTotalOrders = partialDates.reduce((s, d) => s + d.orders, 0);

  // Which dates to render
  const visibleDates = showPartial ? completedByDate : confirmedDates;

  // Coverage info
  const coverage = getDataCoverage(data);

  if (completedByDate.length === 0) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)',
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Belum ada pesanan yang selesai</div>
        <div style={{ fontSize: 11, marginTop: 6 }}>Data muncul saat Affiliate Item Status = Completed</div>
      </div>
    );
  }

  return (
    <div className="animate-in">

      {/* ===== INFO: Cakupan data CSV ===== */}
      {coverage.minOrder && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(0,229,255,0.04)',
          border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--accent)' }}>Cakupan CSV kamu:</strong>{' '}
            Order dari <strong style={{ color: 'var(--text-primary)' }}>{formatDateShort(coverage.minOrder)}</strong>{' '}
            s/d <strong style={{ color: 'var(--text-primary)' }}>{formatDateShort(coverage.maxOrder)}</strong>.{' '}
            Jika angka beda dengan Shopee, itu normal — Shopee menghitung dari{' '}
            <strong>SEMUA order lama</strong> yang complete di hari itu (termasuk order dari bulan lalu),
            sedangkan dashboard ini hanya dari order dalam CSV yang kamu upload.
            <span style={{ color: 'var(--warning)', fontWeight: 700 }}> Upload CSV yang lebih panjang range-nya untuk data lebih lengkap.</span>
          </div>
        </div>
      )}

      {/* ===== SMART ALERT: Partial data detected ===== */}
      {partialDates.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(255,193,7,0.06)',
          border: '1px solid rgba(255,193,7,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px', marginBottom: 16,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 4 }}>
              Data Parsial Terdeteksi Otomatis
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Tanggal <strong style={{ color: 'var(--warning)' }}>
                {partialDates.map(d => formatDateShort(d.date)).join(', ')}
              </strong> kemungkinan <strong>belum lengkap</strong> — CSV didownload saat hari belum selesai,
              sehingga ada order yang mungkin belum masuk.{' '}
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                +{formatRupiah(partialTotalAffiliateComm)} dari {partialTotalOrders} order
              </span> ditandai sebagai estimasi.
            </div>
          </div>
          <button
            onClick={() => setShowPartial(v => !v)}
            style={{
              flexShrink: 0, padding: '4px 12px', fontSize: 11, fontWeight: 700,
              background: showPartial ? 'rgba(255,193,7,0.15)' : 'rgba(0,230,118,0.1)',
              border: `1px solid ${showPartial ? 'rgba(255,193,7,0.4)' : 'rgba(0,230,118,0.4)'}`,
              color: showPartial ? 'var(--warning)' : 'var(--success)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}
          >
            {showPartial ? '🙈 Sembunyikan' : '👁️ Tampilkan'}
          </button>
        </div>
      )}

      {/* ===== GRAND TOTAL: 2 CARDS (Confirmed vs Partial) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: partialDates.length > 0 ? '2fr 1fr' : '1fr', gap: 14, marginBottom: 20 }}>

        {/* Confirmed Total */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,229,255,0.04))',
          border: '1px solid rgba(0,230,118,0.3)',
          borderRadius: 'var(--radius-md)', padding: '20px 24px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--success), var(--accent))' }} />
          <div style={{ fontSize: 10, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: 12 }}>
            ✅ SUDAH PASTI CAIR — {confirmedDates.length} Hari Selesai
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap' }}>💰 Bisa Dicairkan</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                {formatRupiah(confirmedTotalAffiliateComm)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>Affiliate Net Commission</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap' }}>📦 Komisi Kotor</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                {formatRupiah(confirmedTotalComm)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap' }}>🛒 Order</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                {formatNumber(confirmedTotalOrders)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap' }}>💵 GMV</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                {formatRupiah(confirmedTotalPV)}
              </div>
            </div>
          </div>
        </div>

        {/* Partial / Estimasi */}
        {partialDates.length > 0 && (
          <div style={{
            background: 'rgba(255,193,7,0.04)',
            border: '1px solid rgba(255,193,7,0.25)',
            borderRadius: 'var(--radius-md)', padding: '20px 24px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--warning)' }} />
            <div style={{ fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: 12 }}>
              ⚠️ ESTIMASI (Parsial)
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap' }}>💰 Estimasi Cair</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--warning)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                {formatRupiah(partialTotalAffiliateComm)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap' }}>
                {partialTotalOrders} order · Data belum final
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== DAY LIST ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleDates.map(d => {
          const isExpanded = expandedDate === d.date;
          const isPartial = isPartialDate(d.date);
          const maxComm = Math.max(...d.tagLinks.map(t => t.commission), 1);

          return (
            <div
              key={d.date}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isPartial ? 'rgba(255,193,7,0.3)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {/* Partial top stripe */}
              {isPartial && (
                <div style={{
                  padding: '4px 18px',
                  background: 'rgba(255,193,7,0.08)',
                  borderBottom: '1px solid rgba(255,193,7,0.15)',
                  fontSize: 10, color: 'var(--warning)', fontWeight: 700, letterSpacing: '1px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  ⚠️ DATA PARSIAL — Hari belum selesai saat CSV didownload · Angka belum final
                </div>
              )}

              {/* Day Header */}
              <div
                onClick={() => setExpandedDate(isExpanded ? null : d.date)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto auto',
                  gap: 16, padding: '14px 18px', cursor: 'pointer',
                  alignItems: 'center',
                  borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                  background: isExpanded ? (isPartial ? 'rgba(255,193,7,0.03)' : 'rgba(0,230,118,0.02)') : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isPartial ? 'var(--warning)' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isPartial ? '⚠️' : '✅'} {formatDateShort(d.date)}
                    {isPartial && <span style={{ fontSize: 9, background: 'rgba(255,193,7,0.15)', color: 'var(--warning)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', letterSpacing: '1px' }}>PARSIAL</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {getDayName(d.date)} · {d.orders} order · {d.items} item
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>GMV</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatRupiah(d.totalPurchaseValue)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Komisi</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatRupiah(d.totalCommission)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>💰 {isPartial ? 'Estimasi' : 'Cair'}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isPartial ? 'var(--warning)' : 'var(--success)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatRupiah(d.totalAffiliateComm)}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 16, textAlign: 'center' }}>
                  {isExpanded ? '▲' : '▼'}
                </div>
              </div>

              {/* Expanded breakdown */}
              {isExpanded && (
                <div style={{ padding: '12px 18px 16px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
                    Breakdown per TagLink
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {d.tagLinks.map(t => {
                      const barPct = maxComm > 0 ? (t.commission / maxComm) * 100 : 0;
                      return (
                        <div key={t.name}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                padding: '2px 8px',
                                background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
                                borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--accent)',
                                fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                              }}>
                                {t.name}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {t.orders} order · {t.items} item
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {formatRupiah(t.commission)}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: isPartial ? 'var(--warning)' : 'var(--success)', fontFamily: 'JetBrains Mono, monospace', minWidth: 95, textAlign: 'right' }}>
                                💰 {formatRupiah(t.affiliateComm)}
                              </span>
                            </div>
                          </div>
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                            <div style={{
                              height: '100%', width: `${barPct}%`,
                              background: isPartial
                                ? 'linear-gradient(90deg, var(--warning), rgba(255,193,7,0.4))'
                                : 'linear-gradient(90deg, var(--success), var(--accent))',
                              borderRadius: 2, transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
