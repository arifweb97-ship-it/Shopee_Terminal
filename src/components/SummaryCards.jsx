'use client';

import { formatRupiah, formatNumber } from '@/lib/csvParser';

export default function SummaryCards({ totalOrders, totalCommission, totalPurchaseValue, totalTagLinks, totalClicks }) {
  const avgCommPerOrder = totalOrders > 0 ? totalCommission / totalOrders : 0;
  const globalCR = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) + '%' : '-';

  return (
    <div className={totalClicks > 0 ? "grid-4" : "grid-4"} style={totalClicks > 0 ? { gridTemplateColumns: 'repeat(5, 1fr)' } : {}}>
      {totalClicks > 0 && (
        <div className="summary-card accent-cyan animate-in animate-delay-1">
          <div className="card-icon">🖱️</div>
          <div className="card-label">Total Klik</div>
          <div className="card-value">{formatNumber(totalClicks)}</div>
          <div className="card-sub">Global CR: {globalCR}</div>
        </div>
      )}

      <div className="summary-card accent-green animate-in animate-delay-2">
        <div className="card-icon">📦</div>
        <div className="card-label">Total Orders</div>
        <div className="card-value">{formatNumber(totalOrders)}</div>
        <div className="card-sub">Unique orders</div>
      </div>

      <div className="summary-card accent-purple animate-in animate-delay-3">
        <div className="card-icon">💰</div>
        <div className="card-label">Total Komisi</div>
        <div className="card-value">{formatRupiah(totalCommission)}</div>
        <div className="card-sub">Avg {formatRupiah(avgCommPerOrder)}/order</div>
      </div>

      <div className="summary-card accent-orange animate-in animate-delay-4">
        <div className="card-icon">🛒</div>
        <div className="card-label">Penjualan</div>
        <div className="card-value">{formatRupiah(totalPurchaseValue)}</div>
        <div className="card-sub">Purchase value</div>
      </div>

      <div className="summary-card accent-pink animate-in animate-delay-4">
        <div className="card-icon">🏷️</div>
        <div className="card-label">TagLink Aktif</div>
        <div className="card-value">{totalTagLinks}</div>
        <div className="card-sub">Video/link unik</div>
      </div>
    </div>
  );
}
