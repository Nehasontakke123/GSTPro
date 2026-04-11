import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
  DocumentCheckIcon, ChartBarIcon, ArrowDownTrayIcon,
  MagnifyingGlassIcon, ArrowPathIcon, CheckCircleIcon,
  XCircleIcon, ClockIcon, FunnelIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const StatCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="stat-card">
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  </motion.div>
);

const statusIcon = { completed: CheckCircleIcon, processing: ClockIcon, failed: XCircleIcon };
const statusColor = {
  completed: 'badge-success',
  processing: 'badge-warning',
  failed: 'badge-danger'
};

export default function OfficerDashboard() {
  const [stats, setStats] = useState(null);
  const [matched, setMatched] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('completed');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matched');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, matchedRes, reconRes] = await Promise.all([
        api.get('/officer/stats'),
        api.get(`/officer/matched?page=${page}&limit=20&search=${search}`),
        api.get(`/officer/reconciliations?status=${statusFilter}&page=1&limit=20`)
      ]);
      setStats(statsRes.data.stats);
      setMatched(matchedRes.data.data || []);
      setTotalPages(matchedRes.data.totalPages || 1);
      setReconciliations(reconRes.data.data || []);
    } catch {
      toast.error('Failed to load officer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const downloadMatchedReport = async () => {
    try {
      const res = await api.get('/officer/matched/download', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'matched_report.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded!');
    } catch {
      toast.error('Download failed');
    }
  };

  // Chart data
  const pieData = stats ? [
    { name: 'Matched', value: stats.totalMatched, color: '#10b981' },
    { name: 'Unmatched', value: stats.totalUnmatched, color: '#ef4444' }
  ] : [];

  const reconChartData = reconciliations.slice(0, 8).map(r => ({
    id: r.reconciliationId?.slice(0, 8),
    matched: r.summary?.matchedCount || 0,
    unmatched: r.summary?.unmatchedCount || 0
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Officer Dashboard</h1>
          <p className="page-subtitle">Review matched records and reconciliation reports</p>
        </div>
        <button onClick={downloadMatchedReport} className="btn-success flex-shrink-0">
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Download Report</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DocumentCheckIcon} label="Total Matched" value={stats?.totalMatched?.toLocaleString()} color="bg-emerald-500" delay={0} />
        <StatCard icon={XCircleIcon} label="Total Unmatched" value={stats?.totalUnmatched?.toLocaleString()} color="bg-red-500" delay={0.1} />
        <StatCard icon={ChartBarIcon} label="Avg Match Rate" value={stats ? `${stats.avgMatchPercentage}%` : null} color="bg-brand-500" delay={0.2} />
        <StatCard icon={ClockIcon} label="Processing" value={stats?.processing} sub={`${stats?.completed || 0} completed`} color="bg-amber-500" delay={0.3} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white mb-4">Overall Match Distribution</h2>
          {pieData.length > 0 && (pieData[0].value + pieData[1].value) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-6">
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white mb-4">Reconciliation Breakdown</h2>
          {reconChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reconChartData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="id" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="matched" fill="#10b981" name="Matched" radius={[4,4,0,0]} />
                <Bar dataKey="unmatched" fill="#ef4444" name="Unmatched" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No reconciliation data yet</div>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card">
        <div className="flex items-center gap-1 p-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {['matched', 'reconciliations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-brand-500 text-white shadow-glow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab === 'matched' ? '✅ Matched Records' : '📋 All Reconciliations'}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={fetchData} className="btn-ghost p-2 rounded-lg">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeTab === 'matched' && (
          <>
            {/* Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by invoice number or GSTIN..."
                    className="input pl-9 text-sm py-2"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary px-4 py-2">Search</button>
              </form>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-11 rounded-lg" />)}</div>
              ) : matched.length === 0 ? (
                <div className="p-12 text-center">
                  <DocumentCheckIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No matched records found</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Invoice Number</th>
                      <th>GSTIN</th>
                      <th>Purchase Amount</th>
                      <th>GSTR2B Amount</th>
                      <th>Status</th>
                      <th>Matched At</th>
                      <th>Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((r, i) => (
                      <tr key={i}>
                        <td className="text-slate-400">{(page - 1) * 20 + i + 1}</td>
                        <td><code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">{r.invoiceNumber}</code></td>
                        <td className="font-mono text-xs text-slate-600 dark:text-slate-400">{r.gstin}</td>
                        <td className="font-medium">₹{r.purchaseAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="font-medium">₹{r.gstr2bAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td><span className="badge badge-success">✓ Matched</span></td>
                        <td className="text-slate-400 text-xs">{r.matchedAt ? new Date(r.matchedAt).toLocaleDateString() : '—'}</td>
                        <td className="text-xs text-slate-500">{r.initiatedBy?.name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Prev</button>
                <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </>
        )}

        {activeTab === 'reconciliations' && (
          <>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-2">
              <FunnelIcon className="w-4 h-4 text-slate-400 mt-2.5" />
              {['completed', 'processing', 'failed'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); fetchData(); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s
                      ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
              ) : reconciliations.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">No reconciliations found</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Matched</th>
                      <th>Unmatched</th>
                      <th>Match %</th>
                      <th>Initiated By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliations.map((r) => {
                      const StatusIcon = statusIcon[r.status] || ClockIcon;
                      return (
                        <tr key={r.reconciliationId}>
                          <td><code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{r.reconciliationId?.slice(0, 12)}...</code></td>
                          <td>
                            <span className={`badge ${statusColor[r.status]}`}>
                              <StatusIcon className="w-3 h-3" />
                              {r.status}
                            </span>
                          </td>
                          <td className="text-emerald-600 dark:text-emerald-400 font-medium">{r.summary?.matchedCount ?? '—'}</td>
                          <td className="text-red-600 dark:text-red-400 font-medium">{r.summary?.unmatchedCount ?? '—'}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 progress-bar">
                                <div className="progress-fill" style={{ width: `${r.summary?.matchPercentage || 0}%` }} />
                              </div>
                              <span className="text-xs font-medium">{r.summary?.matchPercentage}%</span>
                            </div>
                          </td>
                          <td className="text-sm text-slate-600 dark:text-slate-400">{r.initiatedBy?.name || '—'}</td>
                          <td className="text-slate-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
