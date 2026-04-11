import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
  CloudArrowUpIcon, DocumentMagnifyingGlassIcon, ArrowDownTrayIcon,
  CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon,
  ChevronDownIcon, ChevronUpIcon, ArrowPathIcon, FunnelIcon
} from '@heroicons/react/24/outline';

const reasonLabels = {
  missing_in_gstr2b: { label: 'Missing in GSTR2B', color: 'badge-danger' },
  amount_mismatch:   { label: 'Amount Mismatch',   color: 'badge-warning' },
  tax_mismatch:      { label: 'Tax Mismatch',       color: 'badge-warning' },
  missing_in_purchase: { label: 'Not in Purchase', color: 'badge-info' },
  date_mismatch:     { label: 'Date Mismatch',      color: 'badge-warning' }
};

export default function ClientDashboard() {
  const [batches, setBatches] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedResult, setSelectedResult] = useState(null);
  const [resultDetail, setResultDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterReason, setFilterReason] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [batchRes, resultsRes] = await Promise.all([
        api.get('/client/gstr2b-batches'),
        api.get('/client/results')
      ]);
      setBatches(batchRes.data.data || []);
      setResults(resultsRes.data.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    if (!selectedBatch) {
      toast.error('Please select a GSTR2B batch first');
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('gstr2bUploadId', selectedBatch);

    try {
      const res = await api.post('/client/upload-purchase', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 85) / e.total))
      });
      setUploadProgress(100);
      toast.success(`✅ Reconciliation complete! ${res.data.reconciliation.matchedCount} matched, ${res.data.reconciliation.unmatchedCount} unmatched.`);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 1500);
    }
  }, [selectedBatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    disabled: uploading
  });

  const viewResult = async (result) => {
    if (selectedResult?.reconciliationId === result.reconciliationId) {
      setSelectedResult(null);
      setResultDetail(null);
      return;
    }
    setSelectedResult(result);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/client/results/${result.reconciliationId}`);
      setResultDetail(res.data.data);
    } catch {
      toast.error('Failed to load result details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const downloadCSV = async (reconciliationId) => {
    try {
      const res = await api.get(`/client/results/${reconciliationId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `unmatched_${reconciliationId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch {
      toast.error('Download failed');
    }
  };

  const filteredUnmatched = resultDetail?.unmatchedRecords?.filter(r => {
    const matchesReason = filterReason === 'all' || r.reason === filterReason;
    const matchesSearch = !search || r.invoiceNumber?.includes(search.toUpperCase()) || r.gstin?.includes(search.toUpperCase());
    return matchesReason && matchesSearch;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Client Dashboard</h1>
        <p className="page-subtitle">Upload purchase data and view reconciliation results</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <CloudArrowUpIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">Upload Purchase Data</h2>
              <p className="text-xs text-slate-500">Reconciliation runs automatically</p>
            </div>
          </div>

          {/* GSTR2B batch selector */}
          <div className="mb-4">
            <label className="label">Select GSTR2B Batch to Match Against</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="input"
            >
              <option value="">-- Select a GSTR2B batch --</option>
              {batches.map((b) => (
                <option key={b.uploadId} value={b.uploadId}>
                  {b.returnPeriod || 'No period'} — {b.totalRecords} records — {new Date(b.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
            {batches.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠️ No GSTR2B data available. Ask admin to upload GSTR2B first.</p>
            )}
          </div>

          <div
            {...getRootProps()}
            className={`drop-zone ${isDragActive ? 'drop-zone-active' : ''} ${uploading || !selectedBatch ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center ${isDragActive ? 'animate-bounce' : ''}`}>
                <CloudArrowUpIcon className="w-7 h-7 text-brand-500" />
              </div>
              {isDragActive ? (
                <p className="font-semibold text-brand-600">Drop your purchase file!</p>
              ) : (
                <>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Drag & drop purchase file</p>
                  <p className="text-sm text-slate-400">or click to browse • CSV, XLS, XLSX</p>
                </>
              )}
            </div>
          </div>

          {uploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Processing & Reconciling...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Summary Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          {results.slice(0, 1).map((r) => (
            <div key={r.reconciliationId} className="card p-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Latest Reconciliation</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: CheckCircleIcon, label: 'Matched', val: r.summary?.matchedCount, cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' },
                  { icon: XCircleIcon,     label: 'Unmatched', val: r.summary?.unmatchedCount, cls: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
                  { icon: DocumentMagnifyingGlassIcon, label: 'Total Purchase', val: r.summary?.totalPurchaseRecords, cls: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600' },
                  { icon: ExclamationTriangleIcon, label: 'Missing in GSTR2B', val: r.summary?.missingInGSTR2B, cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' }
                ].map((item) => (
                  <div key={item.label} className={`${item.cls} rounded-xl p-3 flex items-center gap-2`}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-display font-bold">{item.val ?? 0}</p>
                      <p className="text-xs opacity-80">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Match Rate</span>
                  <span className="font-semibold text-emerald-600">{r.summary?.matchPercentage}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${r.summary?.matchPercentage}%` }} />
                </div>
              </div>
            </div>
          ))}
          {results.length === 0 && !loading && (
            <div className="card p-8 text-center">
              <DocumentMagnifyingGlassIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No reconciliation results yet. Upload a purchase file to begin.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Reconciliation Results Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">My Reconciliation Results</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click a result to expand unmatched records</p>
          </div>
          <button onClick={fetchData} className="btn-ghost p-2 rounded-lg">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No results found</div>
          ) : results.map((result) => (
            <div key={result.reconciliationId}>
              <button
                onClick={() => viewResult(result)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  result.summary?.unmatchedCount === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}>
                  {result.summary?.unmatchedCount === 0 ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    ID: {result.reconciliationId?.slice(0, 16)}...
                  </p>
                  <p className="text-xs text-slate-400">{new Date(result.createdAt).toLocaleString()}</p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span className="badge badge-success">{result.summary?.matchedCount} matched</span>
                  {result.summary?.unmatchedCount > 0 && (
                    <span className="badge badge-danger">{result.summary?.unmatchedCount} unmatched</span>
                  )}
                  <span className="font-semibold text-brand-600 dark:text-brand-400">{result.summary?.matchPercentage}%</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadCSV(result.reconciliationId); }}
                  className="btn-ghost p-2 rounded-lg flex-shrink-0"
                  title="Download unmatched CSV"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
                {selectedResult?.reconciliationId === result.reconciliationId
                  ? <ChevronUpIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
              </button>

              {/* Expanded unmatched rows */}
              <AnimatePresence>
                {selectedResult?.reconciliationId === result.reconciliationId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                      {loadingDetail ? (
                        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
                      ) : (
                        <>
                          {/* Filters */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <input
                              type="text"
                              placeholder="Search invoice / GSTIN..."
                              className="input text-xs py-1.5 w-48"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                            />
                            <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)} className="input text-xs py-1.5 w-auto">
                              <option value="all">All Reasons</option>
                              {Object.entries(reasonLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </div>

                          {filteredUnmatched.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-4">
                              {resultDetail?.unmatchedRecords?.length === 0 ? '🎉 All records matched perfectly!' : 'No records match your filter.'}
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="data-table text-xs">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Invoice No.</th>
                                    <th>GSTIN</th>
                                    <th>Reason</th>
                                    <th>Purchase ₹</th>
                                    <th>GSTR2B ₹</th>
                                    <th>Difference ₹</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredUnmatched.map((r, i) => {
                                    const rm = reasonLabels[r.reason] || { label: r.reason, color: 'badge-warning' };
                                    return (
                                      <tr key={i} className="bg-red-50/40 dark:bg-red-900/10">
                                        <td className="text-slate-400">{i + 1}</td>
                                        <td className="font-mono font-medium">{r.invoiceNumber}</td>
                                        <td className="font-mono text-xs">{r.gstin}</td>
                                        <td><span className={`badge ${rm.color}`}>{rm.label}</span></td>
                                        <td>{r.purchaseAmount != null ? `₹${r.purchaseAmount.toFixed(2)}` : '—'}</td>
                                        <td>{r.gstr2bAmount != null ? `₹${r.gstr2bAmount.toFixed(2)}` : '—'}</td>
                                        <td className="text-red-600 dark:text-red-400 font-semibold">
                                          {r.difference != null ? `₹${r.difference.toFixed(2)}` : '—'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
