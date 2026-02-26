"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  MapPin,
  Calendar,
  User,
  CreditCard,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

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
  event_name?: string;
  location?: string;
}

interface CardActivityStats {
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  first_scan?: string;
  last_scan?: string;
  most_common_location?: string;
}

interface CardActivityLogProps {
  cardUid: string;
  cardType?: string;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CardActivityLog({
  cardUid,
  cardType,
  userName,
  isOpen,
  onClose,
}: CardActivityLogProps) {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [stats, setStats] = useState<CardActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!cardUid) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/nfc/scan-logs?card_uid=${cardUid}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);

        // Calculate stats from logs
        if (Array.isArray(data) && data.length > 0) {
          const successful = data.filter((l: ScanLog) => l.success).length;
          const locations = data
            .map((l: ScanLog) => l.location || l.reader_device)
            .filter(Boolean);
          const locationCounts: Record<string, number> = {};
          for (const loc of locations) {
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
          }
          const mostCommon = Object.entries(locationCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0];

          setStats({
            total_scans: data.length,
            successful_scans: successful,
            failed_scans: data.length - successful,
            first_scan: data[data.length - 1]?.created_at,
            last_scan: data[0]?.created_at,
            most_common_location: mostCommon,
          });
        } else {
          setStats(null);
        }
      }
    } catch (err) {
      console.error('Error fetching card activity:', err);
    } finally {
      setLoading(false);
    }
  }, [cardUid]);

  useEffect(() => {
    if (isOpen && cardUid) {
      fetchLogs();
    }
  }, [isOpen, cardUid, fetchLogs]);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getScanTypeConfig(scanType: string) {
    switch (scanType) {
      case 'read':
        return { label: 'Read', color: 'bg-blue-100 text-blue-800', icon: CreditCard };
      case 'write':
        return { label: 'Write', color: 'bg-purple-100 text-purple-800', icon: TrendingUp };
      case 'error':
        return { label: 'Error', color: 'bg-red-100 text-red-800', icon: AlertCircle };
      default:
        return { label: scanType, color: 'bg-gray-100 text-gray-800', icon: Activity };
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gold" />
            Card Activity Log
          </DialogTitle>
          <DialogDescription>
            Scan history for card <code className="font-mono bg-gray-100 px-1 rounded">{cardUid}</code>
            {userName && <span> assigned to <strong>{userName}</strong></span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Card Info Header */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="h-12 w-12 bg-gold/10 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-gold" />
            </div>
            <div>
              <code className="font-mono font-bold text-lg">{cardUid}</code>
              <div className="flex items-center gap-2 mt-1">
                {cardType && (
                  <Badge className="bg-gold/20 text-gold">{cardType}</Badge>
                )}
                {userName && (
                  <span className="text-sm text-gray-600">
                    <User className="h-3 w-3 inline mr-1" />
                    {userName}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total_scans}</div>
                <div className="text-xs text-gray-500">Total Scans</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{stats.successful_scans}</div>
                <div className="text-xs text-green-600">Successful</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{stats.failed_scans}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
              {stats.most_common_location && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-sm font-bold text-blue-700 truncate">{stats.most_common_location}</div>
                  <div className="text-xs text-blue-600">Top Location</div>
                </div>
              )}
            </div>
          )}

          {/* First/Last Scan Info */}
          {stats?.first_scan && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                First scan: {formatDate(stats.first_scan)}
              </div>
              {stats.last_scan && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Last scan: {formatRelativeTime(stats.last_scan)}
                </div>
              )}
            </div>
          )}

          {/* Activity Timeline */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-semibold text-sm">Activity Timeline</h4>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading activity...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No activity recorded for this card yet.</p>
                <p className="text-sm mt-1">Scans will appear here when the card is used.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {logs.map((log, index) => {
                  const scanTypeConfig = getScanTypeConfig(log.scan_type);
                  const ScanIcon = scanTypeConfig.icon;

                  return (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 p-3 hover:bg-gray-50 ${
                        index === 0 ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            log.success
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {log.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                        {index < logs.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${scanTypeConfig.color} text-xs`}>
                            <ScanIcon className="h-3 w-3 mr-1" />
                            {scanTypeConfig.label}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(log.created_at)}
                          </span>
                          {index === 0 && (
                            <Badge className="bg-gold/20 text-gold text-xs">Latest</Badge>
                          )}
                        </div>

                        <div className="mt-1 text-sm">
                          {log.event_name && (
                            <div className="text-gray-700">
                              Event: <strong>{log.event_name}</strong>
                            </div>
                          )}
                          {(log.location || log.reader_device) && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <MapPin className="h-3 w-3" />
                              {log.location || log.reader_device}
                            </div>
                          )}
                          {log.error_message && (
                            <div className="text-red-600 text-xs mt-1">
                              Error: {log.error_message}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-400 mt-1">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline Card Activity Preview (for embedding in other components)
export function CardActivityPreview({
  cardUid,
  className = "",
}: {
  cardUid: string;
  className?: string;
}) {
  const [recentLogs, setRecentLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentLogs() {
      try {
        const response = await fetch(`/api/nfc/scan-logs?card_uid=${cardUid}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setRecentLogs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching recent logs:', err);
      } finally {
        setLoading(false);
      }
    }

    if (cardUid) {
      fetchRecentLogs();
    }
  }, [cardUid]);

  if (loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Loading activity...
      </div>
    );
  }

  if (recentLogs.length === 0) {
    return (
      <div className={`text-sm text-gray-400 ${className}`}>
        No recent activity
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs font-medium text-gray-500 mb-2">Recent Activity</div>
      {recentLogs.slice(0, 3).map((log) => (
        <div key={log.id} className="flex items-center gap-2 text-xs">
          {log.success ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
          <span className="text-gray-600">
            {log.scan_type} - {new Date(log.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
      {recentLogs.length > 3 && (
        <div className="text-xs text-gray-400">
          +{recentLogs.length - 3} more
        </div>
      )}
    </div>
  );
}
