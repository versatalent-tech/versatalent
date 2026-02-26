"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle, XCircle, Clock, CreditCard, User, Activity } from "lucide-react";

interface ScanLog {
  id: string;
  card_uid: string;
  nfc_card_id?: string;
  user_id?: string;
  scan_type: 'read' | 'write' | 'error';
  reader_device?: string;
  success: boolean;
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
  user_name?: string;
  user_email?: string;
  card_type?: string;
}

interface ScanStatistics {
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  unique_cards: number;
  unique_users: number;
}

export function ScanLogsViewer() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [stats, setStats] = useState<ScanStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  async function fetchLogs() {
    try {
      setLoading(true);
      const response = await fetch('/api/nfc/scan-logs?limit=100');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching scan logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/nfc/scan-logs?stats=true');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.card_uid.toLowerCase().includes(query) ||
      log.user_name?.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.reader_device?.toLowerCase().includes(query)
    );
  });

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function getScanTypeConfig(scanType: string) {
    switch (scanType) {
      case 'read':
        return { label: 'Read', color: 'bg-blue-100 text-blue-800' };
      case 'write':
        return { label: 'Write', color: 'bg-purple-100 text-purple-800' };
      case 'error':
        return { label: 'Error', color: 'bg-red-100 text-red-800' };
      default:
        return { label: scanType, color: 'bg-gray-100 text-gray-800' };
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Activity className="h-4 w-4" />
              Total Scans
            </div>
            <div className="text-2xl font-bold">{stats.total_scans}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <CheckCircle className="h-4 w-4" />
              Successful
            </div>
            <div className="text-2xl font-bold text-green-700">{stats.successful_scans}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Failed
            </div>
            <div className="text-2xl font-bold text-red-700">{stats.failed_scans}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CreditCard className="h-4 w-4" />
              Unique Cards
            </div>
            <div className="text-2xl font-bold">{stats.unique_cards}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <User className="h-4 w-4" />
              Unique Users
            </div>
            <div className="text-2xl font-bold">{stats.unique_users}</div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">Scan History ({filteredLogs.length})</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Search by UID, user, device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchLogs(); fetchStats(); }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading scan logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {logs.length === 0 ? 'No scan logs yet.' : 'No logs match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Time</th>
                  <th className="text-left py-3 px-4">Card UID</th>
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Device</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const scanTypeConfig = getScanTypeConfig(log.scan_type);

                  return (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                          {log.card_uid}
                        </code>
                        {log.card_type && (
                          <Badge className="ml-2 text-xs">{log.card_type}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.user_name ? (
                          <div>
                            <div className="font-medium text-sm">{log.user_name}</div>
                            <div className="text-xs text-gray-500">{log.user_email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={scanTypeConfig.color}>
                          {scanTypeConfig.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {log.success ? (
                          <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Success
                          </Badge>
                        ) : (
                          <div>
                            <Badge className="bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                            {log.error_message && (
                              <div className="text-xs text-red-600 mt-1">{log.error_message}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {log.reader_device || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
