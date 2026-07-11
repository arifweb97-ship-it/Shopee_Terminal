/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parseCSVData,
  parseClickData,
  parseMetaAdsData,
  aggregateByTagLink,
  aggregateByDate,
  aggregateByChannel,
  formatNumber,
  formatDateShort,
} from '@/lib/csvParser';
import SummaryCards from '@/components/SummaryCards';
import TagLinkTable from '@/components/TagLinkTable';
import CommissionChart from '@/components/CommissionChart';
import ChannelPieChart from '@/components/ChannelPieChart';
import TimelineChart from '@/components/TimelineChart';
import DailyBreakdown from '@/components/DailyBreakdown';
import CsvUploader from '@/components/CsvUploader';
import TagLinkDetail from '@/components/TagLinkDetail';
import MetaAdsTab from '@/components/MetaAdsTab';
import MetaAdsCampaignDetail from '@/components/MetaAdsCampaignDetail';

export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fileName, setFileName] = useState('');
  const [clickData, setClickData] = useState(null);
  const [clickFileName, setClickFileName] = useState('');
  const [selectedTagLink, setSelectedTagLink] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Meta Ads state
  const [metaAdsRawData, setMetaAdsRawData] = useState([]);
  const [metaAdsFileName, setMetaAdsFileName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // PPN fee state
  const [ppnRate, setPpnRate] = useState(0);
  const [showPpnModal, setShowPpnModal] = useState(false);
  const [pendingMetaFile, setPendingMetaFile] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedCsv = localStorage.getItem('shopee_csv_text');
      const savedName = localStorage.getItem('shopee_csv_name');
      if (savedCsv) {
        const data = parseCSVData(savedCsv);
        setRawData(data);
        setFileName(savedName || 'Uploaded CSV');
      }
      const savedClickCsv = localStorage.getItem('shopee_click_csv_text');
      const savedClickName = localStorage.getItem('shopee_click_csv_name');
      if (savedClickCsv) {
        const cData = parseClickData(savedClickCsv);
        setClickData(cData);
        setClickFileName(savedClickName || 'Click Data CSV');
      }
      const savedPpnRate = parseFloat(localStorage.getItem('meta_ads_ppn_rate')) || 0;
      setPpnRate(savedPpnRate);
      const savedMetaCsv = localStorage.getItem('meta_ads_csv_text');
      const savedMetaName = localStorage.getItem('meta_ads_csv_name');
      if (savedMetaCsv) {
        const mData = parseMetaAdsData(savedMetaCsv, savedPpnRate);
        setMetaAdsRawData(mData);
        setMetaAdsFileName(savedMetaName || 'Meta Ads CSV');
      }
    } catch (e) { /* ignore */ }
  }, []);

  const handleCSVUpload = useCallback((file) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      try {
        localStorage.setItem('shopee_csv_text', csvText);
        localStorage.setItem('shopee_csv_name', file.name);
      } catch (err) { /* ignore */ }
      const data = parseCSVData(csvText);
      setRawData(data);
      setFileName(file.name);
      setDateFrom('');
      setDateTo('');
      setSelectedTagLink(null);
      setLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const handleClickCSVUpload = useCallback((file) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      try {
        localStorage.setItem('shopee_click_csv_text', csvText);
        localStorage.setItem('shopee_click_csv_name', file.name);
      } catch (err) { /* ignore */ }
      const data = parseClickData(csvText);
      setClickData(data);
      setClickFileName(file.name);
      setLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const handleMetaAdsUpload = useCallback((file) => {
    setPendingMetaFile(file);
    setShowPpnModal(true);
  }, []);

  const handlePpnSelect = useCallback((rate) => {
    setPpnRate(rate);
    setShowPpnModal(false);
    try {
      localStorage.setItem('meta_ads_ppn_rate', String(rate));
    } catch (e) { /* ignore */ }

    const file = pendingMetaFile;
    if (!file) return;
    setPendingMetaFile(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      try {
        localStorage.setItem('meta_ads_csv_text', csvText);
        localStorage.setItem('meta_ads_csv_name', file.name);
      } catch (err) { /* ignore */ }
      const data = parseMetaAdsData(csvText, rate);
      setMetaAdsRawData(data);
      setMetaAdsFileName(file.name);
      setLoading(false);
      setActiveTab('metaads');
    };
    reader.readAsText(file);
  }, [pendingMetaFile]);

  const handleResetData = useCallback(() => {
    try {
      localStorage.removeItem('shopee_csv_text');
      localStorage.removeItem('shopee_csv_name');
      localStorage.removeItem('shopee_click_csv_text');
      localStorage.removeItem('shopee_click_csv_name');
      localStorage.removeItem('meta_ads_csv_text');
      localStorage.removeItem('meta_ads_csv_name');
      localStorage.removeItem('meta_ads_ppn_rate');
    } catch (e) { /* ignore */ }
    setRawData([]);
    setClickData(null);
    setMetaAdsRawData([]);
    setFileName('');
    setClickFileName('');
    setMetaAdsFileName('');
    setPpnRate(0);
    setDateFrom('');
    setDateTo('');
    setSelectedTagLink(null);
    setSelectedCampaign(null);
    setActiveTab('overview');
    setShowResetConfirm(false);
  }, []);

  // Combine dates from commission data AND meta ads data
  const uniqueDates = useMemo(() => {
    const commDates = rawData.map(r => r.orderTime?.split(' ')[0]).filter(Boolean);
    const metaDates = metaAdsRawData.map(r => r.reportStart).filter(Boolean);
    return [...new Set([...commDates, ...metaDates])].sort();
  }, [rawData, metaAdsRawData]);

  const minDate = uniqueDates.length > 0 ? uniqueDates[0] : '';
  const maxDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : '';

  // Filter commission data by date
  const filteredData = useMemo(() => {
    if (!dateFrom && !dateTo) return rawData;
    return rawData.filter(r => {
      if (!r.orderTime) return false;
      const d = r.orderTime.split(' ')[0];
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [rawData, dateFrom, dateTo]);

  // Filter meta ads data by date
  const filteredMetaAds = useMemo(() => {
    if (!dateFrom && !dateTo) return metaAdsRawData;
    return metaAdsRawData.filter(r => {
      const d = r.reportStart;
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [metaAdsRawData, dateFrom, dateTo]);

  const tagLinkData = aggregateByTagLink(filteredData, clickData);
  const dateData = aggregateByDate(filteredData);
  const channelData = aggregateByChannel(filteredData);

  const totalOrders = new Set(filteredData.map(r => r.orderId)).size;
  const totalCommission = filteredData.reduce((sum, r) => sum + r.totalOrderComm, 0);
  const totalPurchaseValue = filteredData.reduce((sum, r) => sum + r.purchaseValue, 0);
  const totalTagLinks = new Set(filteredData.map(r => r.tagLink1).filter(Boolean)).size;
  const totalClicks = clickData ? clickData.length : 0;

  const hasDateFilter = dateFrom || dateTo;
  const resetDateFilter = () => { setDateFrom(''); setDateTo(''); };
  const hasAnyData = rawData.length > 0 || metaAdsRawData.length > 0;

  // Get data for selected taglink
  const selectedTagLinkData = useMemo(() => {
    if (!selectedTagLink) return [];
    return filteredData.filter(r => r.tagLink1 === selectedTagLink);
  }, [filteredData, selectedTagLink]);

  const handleTagLinkClick = (name) => {
    setSelectedTagLink(name);
    setActiveTab('detail');
  };

  const handleBackFromDetail = () => {
    setSelectedTagLink(null);
    setActiveTab('overview');
  };

  const handleCampaignClick = (campaignName) => {
    setSelectedCampaign(campaignName);
    setActiveTab('campaign-detail');
  };

  const handleBackFromCampaignDetail = () => {
    setSelectedCampaign(null);
    setActiveTab('metaads');
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Memuat data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Nav */}
      <nav className="nav-header">
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); setSelectedTagLink(null); setSelectedCampaign(null); setActiveTab('overview'); }}>
          <div className="nav-logo-icon">ST</div>
          <span className="nav-logo-text">SHOPEE TERMINAL</span>
        </div>
        <div className="nav-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {hasAnyData && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn-reset-data"
                onClick={() => setShowResetConfirm(true)}
                title="Reset semua data"
                id="btn-reset-data"
              >
                🗑️ Reset
              </button>
              {showResetConfirm && (
                <div className="reset-confirm-popup">
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Hapus semua data?<br/>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Data komisi, klik & meta ads akan dihapus.</span>
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setShowResetConfirm(false)} style={{ fontSize: '12px', padding: '4px 12px' }}>Batal</button>
                    <button className="btn-confirm-reset" onClick={handleResetData}>Ya, Hapus</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <CsvUploader onUpload={handleCSVUpload} id="comm-upload" label="Komisi" />
          <CsvUploader onUpload={handleClickCSVUpload} id="click-upload" label="Klik" icon="🖱️" />
          <CsvUploader onUpload={handleMetaAdsUpload} id="meta-upload" label="Meta Ads" icon="📊" />
        </div>

        {/* PPN Fee Selection Modal */}
        {showPpnModal && (
          <div className="ppn-modal-overlay" onClick={() => { setShowPpnModal(false); setPendingMetaFile(null); }}>
            <div className="ppn-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ppn-modal-header">
                <span className="ppn-modal-icon">🧾</span>
                <h3>Pilih Fee PPN Meta Ads</h3>
                <p>Biaya iklan akan ditambah PPN sesuai pilihan kamu</p>
              </div>
              <div className="ppn-modal-options">
                <button
                  className="ppn-option"
                  onClick={() => handlePpnSelect(0)}
                  id="ppn-option-0"
                >
                  <span className="ppn-option-rate">0%</span>
                  <span className="ppn-option-label">Tanpa PPN</span>
                  <span className="ppn-option-desc">Pakai angka mentah dari CSV</span>
                </button>
                <button
                  className="ppn-option ppn-option-recommended"
                  onClick={() => handlePpnSelect(5)}
                  id="ppn-option-5"
                >
                  <span className="ppn-option-badge">RECOMMENDED</span>
                  <span className="ppn-option-rate">5%</span>
                  <span className="ppn-option-label">PPN 5%</span>
                  <span className="ppn-option-desc">Tarif PPN paling umum untuk iklan digital</span>
                </button>
                <button
                  className="ppn-option"
                  onClick={() => handlePpnSelect(11)}
                  id="ppn-option-11"
                >
                  <span className="ppn-option-rate">11%</span>
                  <span className="ppn-option-label">PPN 11%</span>
                  <span className="ppn-option-desc">Tarif PPN penuh</span>
                </button>
              </div>
              <button
                className="ppn-modal-cancel"
                onClick={() => { setShowPpnModal(false); setPendingMetaFile(null); }}
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Empty State */}
      {!hasAnyData && !loading && (
        <div className="welcome-screen">
          <div className="welcome-icon">&gt;_</div>
          <h1 className="welcome-title">SHOPEE TERMINAL : COMMISSION SYS</h1>
          <p className="welcome-desc">
            AWAITING DATA INPUT... UPLOAD COMMISSION REPORT [REQ], CLICK REPORT [OPT], OR META ADS [OPT] TO INITIALIZE TERMINAL.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
            <div className="upload-zone" onClick={() => document.getElementById('comm-upload')?.click()}>
              <div className="upload-text">[1] LOAD COMM DATA</div>
            </div>
            <div className="upload-zone" onClick={() => document.getElementById('click-upload')?.click()}>
              <div className="upload-text">[2] LOAD CLICK DATA</div>
            </div>
            <div className="upload-zone" onClick={() => document.getElementById('meta-upload')?.click()}>
              <div className="upload-text">[3] LOAD META ADS</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      {hasAnyData && (
      <>
      {/* Compact Header */}
      <header className="page-header" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
        <h1 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>SYS_COMM_DASHBOARD</h1>
        <p className="page-meta" style={{ color: 'var(--text-primary)' }}>
          {fileName && <>{fileName} · </>}
          {rawData.length > 0 && <>{formatNumber(rawData.length)} items · {uniqueDates.length} hari</>}
          {metaAdsRawData.length > 0 && <> · 📊 Meta Ads: {metaAdsFileName}{ppnRate > 0 && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', background: 'rgba(255,180,0,0.15)', border: '1px solid rgba(255,180,0,0.3)', color: '#ffb000' }}>+{ppnRate}% PPN</span>}</>}
          {hasDateFilter && <> · <span className="text-accent-inline">{formatDateShort(dateFrom || minDate)} — {formatDateShort(dateTo || maxDate)}</span></>}
        </p>
      </header>

      {/* Date Range Filter - only show when commission data exists */}
      {rawData.length > 0 && (
        <div className="filter-bar">
          <div className="date-range-group">
            <label>Rentang Waktu</label>
            <div className="date-range-inputs">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} min={minDate} max={dateTo || maxDate} id="date-from" />
              <span className="date-range-sep">→</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || minDate} max={maxDate} id="date-to" />
            </div>
          </div>
          {hasDateFilter && (
            <button className="btn btn-ghost" onClick={resetDateFilter}>✕ Reset</button>
          )}
          <div className="date-range-info">
            {!hasDateFilter
              ? <span>{formatDateShort(minDate)} — {formatDateShort(maxDate)}</span>
              : <span>{formatNumber(filteredData.length)} dari {formatNumber(rawData.length)} items</span>
            }
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          ...(rawData.length > 0 ? [
            { key: 'overview', icon: '>', label: 'OVERVIEW' },
            { key: 'taglinks', icon: '>', label: 'TAGLINKS' },
            { key: 'daily', icon: '>', label: 'DAILY' },
          ] : []),
          ...(metaAdsRawData.length > 0 ? [
            { key: 'metaads', icon: '📊', label: 'META ADS' },
          ] : []),
        ].map(t => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.key); if (t.key !== 'detail') setSelectedTagLink(null); if (t.key !== 'campaign-detail') setSelectedCampaign(null); }}
            id={`tab-${t.key}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        {activeTab === 'detail' && selectedTagLink && (
          <button className="tab active" id="tab-detail">
            &gt; {selectedTagLink.toUpperCase()}
          </button>
        )}
        {activeTab === 'campaign-detail' && selectedCampaign && (
          <button className="tab active" id="tab-campaign-detail">
            📊 {selectedCampaign.replace(/\s*Setingan\s*New/gi, '').trim().toUpperCase()}
          </button>
        )}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && rawData.length > 0 && (
        <div>
          <section className="section">
            <SummaryCards totalOrders={totalOrders} totalCommission={totalCommission} totalPurchaseValue={totalPurchaseValue} totalTagLinks={totalTagLinks} totalClicks={totalClicks} />
          </section>
          <section className="section grid-2-1">
            <div className="card animate-in animate-delay-1">
              <div className="card-header"><h3>Komisi per TagLink</h3></div>
              <CommissionChart data={tagLinkData} />
            </div>
            <div className="card animate-in animate-delay-2">
              <div className="card-header"><h3>Channel Distribusi</h3></div>
              <ChannelPieChart data={channelData} />
            </div>
          </section>
          <section className="section">
            <div className="card animate-in animate-delay-3">
              <div className="card-header"><h3>Trend Harian</h3></div>
              <TimelineChart data={dateData} />
            </div>
          </section>
          <section className="section">
            <h2 className="section-title">Ranking TagLink</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <TagLinkTable data={tagLinkData} onTagLinkClick={handleTagLinkClick} />
            </div>
          </section>
        </div>
      )}

      {/* TAGLINKS */}
      {activeTab === 'taglinks' && (
        <div>
          <h2 className="section-title">Detail per TagLink</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <TagLinkTable data={tagLinkData} showDetails onTagLinkClick={handleTagLinkClick} />
          </div>
        </div>
      )}

      {/* DAILY */}
      {activeTab === 'daily' && (
        <div>
          <h2 className="section-title">Breakdown Harian</h2>
          <DailyBreakdown data={dateData} />
        </div>
      )}

      {/* TAGLINK DETAIL */}
      {activeTab === 'detail' && selectedTagLink && (
        <TagLinkDetail
          tagName={selectedTagLink}
          data={selectedTagLinkData}
          tagInfo={tagLinkData.find(t => t.name === selectedTagLink)}
          onBack={handleBackFromDetail}
        />
      )}

      {/* META ADS TAB */}
      {activeTab === 'metaads' && metaAdsRawData.length > 0 && (
        <MetaAdsTab
          metaAdsData={filteredMetaAds}
          allMetaAdsData={metaAdsRawData}
          tagLinkData={tagLinkData}
          commissionData={filteredData}
          onCampaignClick={handleCampaignClick}
        />
      )}

      {/* META ADS CAMPAIGN DETAIL */}
      {activeTab === 'campaign-detail' && selectedCampaign && (
        <MetaAdsCampaignDetail
          campaignName={selectedCampaign}
          metaAdsData={filteredMetaAds}
          tagLinkData={tagLinkData}
          commissionData={filteredData}
          onBack={handleBackFromCampaignDetail}
        />
      )}

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Hans Corporation. All rights reserved. · Shopee Affiliate Commission Dashboard · Meta Ads Performance Analyzer</p>
      </footer>
      </>
      )}
    </div>
  );
}
