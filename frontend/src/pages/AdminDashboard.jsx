import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
  CloudArrowUpIcon, UsersIcon, DocumentCheckIcon,
  ChartBarIcon, TrashIcon, ArrowPathIcon,
  CheckCircleIcon, ExclamationCircleIcon, ClockIcon
} from '@heroicons/react/24/outline';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay }} className="stat-card"
  >
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  </motion.div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [users, setUsers] = useState([]);

  const fetchData = async () => {
    try {
      const [statsRes, histRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/gstr2b-history'),
        api.get('/admin/users')
      ]);
      setStats(statsRes.data.stats);
      setHistory(histRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await api.post('/admin/upload-gstr2b', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 90) / e.total));
        }
      });
      setUploadProgress(100);
      toast.success(`✅ ${res.data.totalRecords} GSTR2B records uploaded! Upload ID: ${res.data.uploadId.slice(0, 8)}...`);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 1500);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    disabled: uploading
  });

  const deleteBatch = async (uploadId) => {
    if (!confirm('Delete this GSTR2B batch? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/gstr2b/${uploadId}`);
      toast.success('Batch deleted successfully');
      await fetchData();
    } catch {
      toast.error('Failed to delete batch');
    }
  };

  const roleColor = { admin: 'bg-violet-500', client: 'bg-brand-500', officer: 'bg-emerald-500' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage GSTR2B uploads, users, and system overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UsersIcon} label="Total Users" value={stats?.totalUsers} color="bg-violet-500" delay={0} />
        <StatCard icon={DocumentCheckIcon} label="GSTR2B Records" value={stats?.totalGSTR2BRecords?.toLocaleString()} color="bg-brand-500" delay={0.1} />
        <StatCard icon={CloudArrowUpIcon} label="Purchase Records" value={stats?.totalPurchaseRecords?.toLocaleString()} color="bg-emerald-500" delay={0.2} />
        <StatCard icon={ChartBarIcon} label="Reconciliations" value={stats?.totalReconciliations} color="bg-amber-500" delay={0.3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload GSTR2B */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <CloudArrowUpIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">Upload GSTR2B Data</h2>
              <p className="text-xs text-slate-500">CSV or Excel files up to 10MB</p>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`drop-zone ${isDragActive ? 'drop-zone-active' : ''} ${uploading ? 'opacity-60 cursor-wait' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center ${isDragActive ? 'animate-bounce' : ''}`}>
                <CloudArrowUpIcon className="w-7 h-7 text-brand-500" />
              </div>
              {isDragActive ? (
                <p className="font-semibold text-brand-600 dark:text-brand-400">Drop file here!</p>
              ) : (
                <>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Drag & drop GSTR2B file</p>
                  <p className="text-sm text-slate-400">or click to browse • CSV, XLS, XLSX</p>
                </>
              )}
            </div>
          </div>

          {uploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Uploading & Processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              📋 Required columns: GSTIN, Invoice Number, Taxable Amount, IGST, CGST, SGST, Total Amount
            </p>
          </div>
        </motion.div>

        {/* User Management */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">All Users</h2>
                <p className="text-xs text-slate-500">{users.length} registered accounts</p>
              </div>
            </div>
            <button onClick={fetchData} className="btn-ghost p-2 rounded-lg">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {users.map((user) => (
              <div key={user._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className={`w-8 h-8 rounded-full ${roleColor[user.role] || 'bg-slate-400'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <span className={`badge ${user.role === 'admin' ? 'badge-info' : user.role === 'officer' ? 'badge-success' : 'badge-warning'}`}>
                  {user.role}
                </span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No users found</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Upload History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">GSTR2B Upload History</h2>
            <p className="text-xs text-slate-500 mt-0.5">All uploaded GSTR2B data batches</p>
          </div>
          <button onClick={fetchData} className="btn-ghost p-2 rounded-lg">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loadingHistory ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <CloudArrowUpIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No GSTR2B uploads yet. Upload your first file above.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Upload ID</th>
                  <th>Records</th>
                  <th>Total Amount</th>
                  <th>Return Period</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.uploadId}>
                    <td><code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">{h.uploadId?.slice(0, 12)}...</code></td>
                    <td><span className="badge badge-info">{h.totalRecords?.toLocaleString()}</span></td>
                    <td className="font-medium">₹{h.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td>{h.returnPeriod || '—'}</td>
                    <td className="text-slate-400 text-xs">{h.createdAt ? new Date(h.createdAt).toLocaleString() : '—'}</td>
                    <td>
                      <button onClick={() => deleteBatch(h.uploadId)} className="btn-ghost p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
