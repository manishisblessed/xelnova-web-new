'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Building2,
  CreditCard,
  FileText,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge } from '@xelnova/ui';

interface VerificationLog {
  id: string;
  type: string;
  identifier: string;
  status: string;
  response?: any;
  verifiedData?: any;
  errorMessage?: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '/api/v1';

async function fetchWithAuth(endpoint: string) {
  const token = typeof window !== 'undefined' 
    ? document.cookie.split('; ').find(row => row.startsWith('xelnova-dashboard-token='))?.split('=')[1]
    : null;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default function VerificationsPage() {
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetchWithAuth(`/verification/logs?${params.toString()}`);
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch verification logs:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge variant="success">Verified</Badge>;
      case 'URL_CREATED':
        return <Badge variant="default">URL Created</Badge>;
      case 'INVALID':
      case 'INVALID_FORMAT':
        return <Badge variant="danger">Invalid</Badge>;
      case 'NOT_FOUND':
        return <Badge variant="warning">Not Found</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      case 'ERROR':
      case 'API_ERROR':
      case 'CONFIG_ERROR':
      case 'SERVICE_ERROR':
        return <Badge variant="danger">Error</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'GSTIN':
        return <FileText size={16} className="text-blue-500" />;
      case 'IFSC':
        return <CreditCard size={16} className="text-purple-500" />;
      case 'PAN_VERIFY':
      case 'PAN_360':
      case 'PAN_DIGILOCKER_URL':
      case 'PAN_DIGILOCKER_DOC':
        return <Building2 size={16} className="text-orange-500" />;
      case 'AADHAAR_DIGILOCKER_URL':
      case 'AADHAAR_DIGILOCKER_DOC':
        return <FileText size={16} className="text-emerald-500" />;
      case 'BANK_VERIFY':
        return <CreditCard size={16} className="text-indigo-500" />;
      default:
        return <FileText size={16} className="text-gray-500" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        log.identifier.toLowerCase().includes(searchLower) ||
        log.user?.name?.toLowerCase().includes(searchLower) ||
        log.user?.email?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const stats = {
    total: logs.length,
    verified: logs.filter(l => l.status === 'VERIFIED').length,
    failed: logs.filter(l => ['INVALID', 'INVALID_FORMAT', 'NOT_FOUND', 'ERROR'].includes(l.status)).length,
    gstin: logs.filter(l => l.type === 'GSTIN').length,
    ifsc: logs.filter(l => l.type === 'IFSC').length,
    aadhaar: logs.filter(l => l.type.startsWith('AADHAAR')).length,
    pan: logs.filter(l => l.type.startsWith('PAN')).length,
  };

  if (loading) {
    return (
      <>
        <DashboardHeader title="Verifications" />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-6 animate-pulse">
                <div className="h-4 w-24 bg-surface-muted rounded mb-2" />
                <div className="h-8 w-16 bg-surface-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Verifications" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">Total</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">Verified</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.verified}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">Failed</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">GSTIN</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.gstin}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">IFSC</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.ifsc}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">Aadhaar</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.aadhaar}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">PAN</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pan}</p>
          </div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">All Types</option>
            <option value="GSTIN">GSTIN</option>
            <option value="IFSC">IFSC</option>
            <option value="BANK_VERIFY">Bank Verify</option>
            <option value="PAN_VERIFY">PAN Verify</option>
            <option value="PAN_360">PAN 360</option>
            <option value="PAN_DIGILOCKER_URL">PAN Digilocker URL</option>
            <option value="PAN_DIGILOCKER_DOC">PAN Digilocker Doc</option>
            <option value="AADHAAR_DIGILOCKER_URL">Aadhaar Digilocker URL</option>
            <option value="AADHAAR_DIGILOCKER_DOC">Aadhaar Digilocker Doc</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="INVALID">Invalid</option>
            <option value="NOT_FOUND">Not Found</option>
            <option value="ERROR">Error</option>
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 flex-1 min-w-[200px]">
            <Search size={18} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search identifier, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={() => { setLoading(true); fetchLogs(); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-muted transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </motion.div>

        {/* Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Identifier</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">User</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Details</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border-light hover:bg-surface-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.type)}
                        <span className="font-medium">{log.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{log.identifier}</td>
                    <td className="py-3 px-4">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="py-3 px-4">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-text-primary">{log.user.name}</p>
                          <p className="text-xs text-text-muted">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'VERIFIED' && log.verifiedData ? (
                        <div className="text-xs">
                          {log.type === 'GSTIN' && log.verifiedData.tradeName && (
                            <p className="text-text-primary">{log.verifiedData.tradeName}</p>
                          )}
                          {log.type === 'IFSC' && log.verifiedData.BANK && (
                            <p className="text-text-primary">{log.verifiedData.BANK}</p>
                          )}
                          {log.type === 'AADHAAR_DIGILOCKER_DOC' && log.verifiedData.name && (
                            <p className="text-text-primary">{log.verifiedData.name}{log.verifiedData.dob ? ` (DOB: ${log.verifiedData.dob})` : ''}</p>
                          )}
                          {log.type === 'PAN_360' && log.verifiedData.registeredName && (
                            <p className="text-text-primary">{log.verifiedData.registeredName}{log.verifiedData.dob ? ` — DOB: ${log.verifiedData.dob}` : ''}</p>
                          )}
                          {log.type === 'PAN_VERIFY' && log.verifiedData.registeredName && (
                            <p className="text-text-primary">{log.verifiedData.registeredName} ({log.verifiedData.type})</p>
                          )}
                          {log.type === 'PAN_DIGILOCKER_DOC' && log.verifiedData.name && (
                            <p className="text-text-primary">{log.verifiedData.name}{log.verifiedData.panNumber ? ` — ${log.verifiedData.panNumber}` : ''}</p>
                          )}
                          {log.type === 'BANK_VERIFY' && log.verifiedData.nameAtBank && (
                            <p className="text-text-primary">{log.verifiedData.nameAtBank}{log.verifiedData.bankName ? ` — ${log.verifiedData.bankName}` : ''}</p>
                          )}
                        </div>
                      ) : log.errorMessage ? (
                        <p className="text-xs text-red-500 truncate max-w-[200px]" title={log.errorMessage}>
                          {log.errorMessage}
                        </p>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      No verification logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
