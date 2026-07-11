'use client';

import { useRef } from 'react';

export default function CsvUploader({ onUpload, id = 'csv-upload-input', label = 'Upload CSV', icon = '📂' }) {
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      onUpload(file);
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        style={{ display: 'none' }}
        id={id}
      />
      <button
        className="btn btn-primary"
        onClick={() => fileRef.current?.click()}
        id={`btn-${id}`}
      >
        {icon} {label}
      </button>
    </>
  );
}
