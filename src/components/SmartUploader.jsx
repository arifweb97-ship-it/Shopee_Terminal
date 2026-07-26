'use client';

import { useState, useRef, useCallback } from 'react';
import { detectCSVType } from '@/lib/csvParser';

const FILE_TYPE_CONFIG = {
  commission: {
    label: 'Shopee Komisi',
    icon: '🛒',
    color: '#00ff00',
    bgColor: 'rgba(0, 255, 0, 0.08)',
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  meta_ads: {
    label: 'Meta Ads',
    icon: '📊',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  click: {
    label: 'Shopee Klik',
    icon: '🖱️',
    color: '#00ffff',
    bgColor: 'rgba(0, 255, 255, 0.08)',
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  unknown: {
    label: 'Tidak Dikenali',
    icon: '❓',
    color: '#ff4444',
    bgColor: 'rgba(255, 68, 68, 0.08)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
};

export default function SmartUploader({ onProcessFiles, isCompact = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [detectedFiles, setDetectedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const fileInputRef = useRef(null);

  const readFileText = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    });
  };

  const handleFiles = useCallback(async (files) => {
    const csvFiles = Array.from(files).filter(f => f.name.endsWith('.csv'));
    if (csvFiles.length === 0) return;

    const detected = [];
    for (const file of csvFiles) {
      const text = await readFileText(file);
      const type = detectCSVType(text);
      detected.push({ file, text, type, name: file.name });
    }
    setDetectedFiles(detected);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  }, [handleFiles]);

  const handleProcess = useCallback(async () => {
    if (detectedFiles.length === 0) return;
    setProcessing(true);
    setProcessedCount(0);

    // Group by type
    const grouped = { commission: [], meta_ads: [], click: [] };
    detectedFiles.forEach(f => {
      if (grouped[f.type]) grouped[f.type].push(f);
    });

    // Check if there's a meta_ads file — if so, we need PPN rate
    const hasMetaAds = grouped.meta_ads.length > 0;

    await onProcessFiles(grouped, (count) => setProcessedCount(count), hasMetaAds);

    setProcessing(false);
    setDetectedFiles([]);
  }, [detectedFiles, onProcessFiles]);

  const handleCancel = useCallback(() => {
    setDetectedFiles([]);
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setDetectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Count by type
  const typeCounts = {};
  detectedFiles.forEach(f => {
    typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
  });
  const unknownCount = typeCounts.unknown || 0;
  const validCount = detectedFiles.length - unknownCount;

  if (isCompact) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
          id="smart-upload-input"
        />
        <button
          className="btn btn-primary smart-upload-compact-btn"
          onClick={() => fileInputRef.current?.click()}
          id="btn-smart-upload"
        >
          📁 Upload Data
        </button>

        {/* File detection modal */}
        {detectedFiles.length > 0 && (
          <div className="smart-upload-modal-overlay" onClick={handleCancel}>
            <div className="smart-upload-modal" onClick={(e) => e.stopPropagation()}>
              <div className="smart-upload-modal-header">
                <span className="smart-upload-modal-icon">📂</span>
                <h3>File Terdeteksi</h3>
                <p>{detectedFiles.length} file CSV ditemukan</p>
              </div>

              <div className="smart-upload-file-list">
                {detectedFiles.map((f, i) => {
                  const config = FILE_TYPE_CONFIG[f.type];
                  return (
                    <div
                      key={i}
                      className="smart-upload-file-item"
                      style={{ borderColor: config.borderColor, background: config.bgColor }}
                    >
                      <div className="smart-upload-file-info">
                        <span className="smart-upload-file-icon">{config.icon}</span>
                        <div>
                          <div className="smart-upload-file-name">{f.name}</div>
                          <div className="smart-upload-file-type" style={{ color: config.color }}>
                            {config.label}
                          </div>
                        </div>
                      </div>
                      <button
                        className="smart-upload-file-remove"
                        onClick={() => handleRemoveFile(i)}
                        title="Hapus file"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {unknownCount > 0 && (
                <div className="smart-upload-warning">
                  ⚠️ {unknownCount} file tidak dikenali dan akan dilewati
                </div>
              )}

              <div className="smart-upload-summary">
                {Object.entries(typeCounts)
                  .filter(([type]) => type !== 'unknown')
                  .map(([type, count]) => {
                    const config = FILE_TYPE_CONFIG[type];
                    return (
                      <span key={type} className="smart-upload-type-badge" style={{ color: config.color, borderColor: config.borderColor, background: config.bgColor }}>
                        {config.icon} {count}× {config.label}
                      </span>
                    );
                  })}
              </div>

              <div className="smart-upload-modal-actions">
                <button className="ppn-modal-cancel" onClick={handleCancel}>Batal</button>
                <button
                  className="btn btn-primary"
                  onClick={handleProcess}
                  disabled={validCount === 0 || processing}
                  style={{ flex: 1 }}
                >
                  {processing
                    ? `⏳ Processing ${processedCount}/${validCount}...`
                    : `🚀 Proses ${validCount} File`
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full-size welcome screen mode
  return (
    <div
      className={`smart-upload-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        onChange={handleInputChange}
        style={{ display: 'none' }}
        id="smart-upload-input-full"
      />

      {detectedFiles.length === 0 ? (
        <>
          <div className="smart-upload-icon">
            {isDragOver ? '📥' : '📂'}
          </div>
          <div className="smart-upload-title">
            {isDragOver ? 'DROP FILES DI SINI' : 'DRAG & DROP CSV FILES'}
          </div>
          <div className="smart-upload-hint">
            Upload banyak file sekaligus — Shopee Komisi, Meta Ads, atau Klik
          </div>
          <div className="smart-upload-hint" style={{ marginTop: 4, fontSize: 10 }}>
            Auto-detect tipe file · Klik atau drag & drop
          </div>
          <div className="smart-upload-badges">
            <span className="smart-upload-type-indicator" style={{ color: '#00ff00', borderColor: 'rgba(0,255,0,0.3)' }}>🛒 Shopee Komisi</span>
            <span className="smart-upload-type-indicator" style={{ color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}>📊 Meta Ads</span>
            <span className="smart-upload-type-indicator" style={{ color: '#00ffff', borderColor: 'rgba(0,255,255,0.3)' }}>🖱️ Shopee Klik</span>
          </div>
        </>
      ) : (
        <div className="smart-upload-detected" onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>
            📂 {detectedFiles.length} FILE TERDETEKSI
          </h3>

          <div className="smart-upload-file-list">
            {detectedFiles.map((f, i) => {
              const config = FILE_TYPE_CONFIG[f.type];
              return (
                <div
                  key={i}
                  className="smart-upload-file-item"
                  style={{ borderColor: config.borderColor, background: config.bgColor }}
                >
                  <div className="smart-upload-file-info">
                    <span className="smart-upload-file-icon">{config.icon}</span>
                    <div>
                      <div className="smart-upload-file-name">{f.name}</div>
                      <div className="smart-upload-file-type" style={{ color: config.color }}>
                        {config.label}
                      </div>
                    </div>
                  </div>
                  <button
                    className="smart-upload-file-remove"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                    title="Hapus file"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {unknownCount > 0 && (
            <div className="smart-upload-warning">
              ⚠️ {unknownCount} file tidak dikenali dan akan dilewati
            </div>
          )}

          <div className="smart-upload-actions">
            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); handleCancel(); }}>
              ✕ Batal
            </button>
            <button
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); handleProcess(); }}
              disabled={validCount === 0 || processing}
            >
              {processing
                ? `⏳ Processing ${processedCount}/${validCount}...`
                : `🚀 Proses ${validCount} File`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
