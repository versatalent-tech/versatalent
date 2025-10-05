"use client";

import { AnalyticsEvent, RealTimeAnalytics } from '@/lib/types/analytics';

// Real-time event types
export type RealtimeEventType =
  | 'new_event'
  | 'metrics_updated'
  | 'active_visitors_changed'
  | 'goal_achieved'
  | 'performance_alert';

export interface RealtimeEvent {
  type: RealtimeEventType;
  talentId: string;
  data: any;
  timestamp: string;
}

export interface RealtimeSubscription {
  talentId: string;
  eventTypes: RealtimeEventType[];
  callback: (event: RealtimeEvent) => void;
}

// Real-time Analytics Service using Server-Sent Events
export class RealtimeAnalyticsService {
  private static instance: RealtimeAnalyticsService;
  private eventSources: Map<string, EventSource> = new Map();
  private subscriptions: Map<string, RealtimeSubscription[]> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  static getInstance(): RealtimeAnalyticsService {
    if (!this.instance) {
      this.instance = new RealtimeAnalyticsService();
    }
    return this.instance;
  }

  // Subscribe to real-time updates for a specific talent
  subscribe(subscription: RealtimeSubscription): () => void {
    const { talentId } = subscription;

    // Add subscription to the list
    if (!this.subscriptions.has(talentId)) {
      this.subscriptions.set(talentId, []);
    }
    this.subscriptions.get(talentId)!.push(subscription);

    // Create or reuse EventSource connection
    this.ensureConnection(talentId);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(talentId, subscription);
    };
  }

  // Unsubscribe from real-time updates
  private unsubscribe(talentId: string, subscription: RealtimeSubscription): void {
    const subscriptions = this.subscriptions.get(talentId);
    if (subscriptions) {
      const index = subscriptions.indexOf(subscription);
      if (index > -1) {
        subscriptions.splice(index, 1);
      }

      // Close connection if no more subscriptions
      if (subscriptions.length === 0) {
        this.closeConnection(talentId);
      }
    }
  }

  // Ensure EventSource connection exists for talent
  private ensureConnection(talentId: string): void {
    if (this.eventSources.has(talentId)) {
      return; // Connection already exists
    }

    this.createConnection(talentId);
  }

  // Create new EventSource connection
  private createConnection(talentId: string): void {
    try {
      const url = `/api/analytics/realtime/stream?talentId=${encodeURIComponent(talentId)}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log(`Real-time analytics connected for talent: ${talentId}`);
        this.reconnectAttempts.set(talentId, 0); // Reset reconnect attempts
      };

      eventSource.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
          this.handleRealtimeEvent(realtimeEvent);
        } catch (error) {
          console.error('Error parsing real-time event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`Real-time analytics connection error for talent ${talentId}:`, error);
        this.handleConnectionError(talentId);
      };

      // Handle specific event types
      eventSource.addEventListener('new_event', (event) => {
        const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
        this.handleRealtimeEvent(realtimeEvent);
      });

      eventSource.addEventListener('metrics_updated', (event) => {
        const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
        this.handleRealtimeEvent(realtimeEvent);
      });

      eventSource.addEventListener('active_visitors_changed', (event) => {
        const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
        this.handleRealtimeEvent(realtimeEvent);
      });

      this.eventSources.set(talentId, eventSource);

    } catch (error) {
      console.error(`Failed to create EventSource for talent ${talentId}:`, error);
      this.scheduleReconnect(talentId);
    }
  }

  // Handle incoming real-time events
  private handleRealtimeEvent(event: RealtimeEvent): void {
    const subscriptions = this.subscriptions.get(event.talentId);
    if (!subscriptions) return;

    subscriptions.forEach(subscription => {
      // Check if subscription is interested in this event type
      if (subscription.eventTypes.includes(event.type)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error('Error in real-time event callback:', error);
        }
      }
    });
  }

  // Handle connection errors and implement reconnection logic
  private handleConnectionError(talentId: string): void {
    this.closeConnection(talentId);
    this.scheduleReconnect(talentId);
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(talentId: string): void {
    const attempts = this.reconnectAttempts.get(talentId) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for talent ${talentId}`);
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    this.reconnectAttempts.set(talentId, attempts + 1);

    console.log(`Scheduling reconnection for talent ${talentId} in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(() => {
      // Only reconnect if we still have subscriptions
      if (this.subscriptions.has(talentId) && this.subscriptions.get(talentId)!.length > 0) {
        this.createConnection(talentId);
      }
    }, delay);
  }

  // Close connection for a specific talent
  private closeConnection(talentId: string): void {
    const eventSource = this.eventSources.get(talentId);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(talentId);
    }
    this.subscriptions.delete(talentId);
    this.reconnectAttempts.delete(talentId);
  }

  // Close all connections
  disconnect(): void {
    this.eventSources.forEach((eventSource, talentId) => {
      eventSource.close();
    });
    this.eventSources.clear();
    this.subscriptions.clear();
    this.reconnectAttempts.clear();
  }

  // Get connection status
  getConnectionStatus(talentId: string): 'connected' | 'connecting' | 'disconnected' | 'error' {
    const eventSource = this.eventSources.get(talentId);
    if (!eventSource) return 'disconnected';

    switch (eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'connecting';
      case EventSource.OPEN:
        return 'connected';
      case EventSource.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  // Send real-time event (for server-side use)
  static async broadcastEvent(event: RealtimeEvent): Promise<void> {
    // This would typically use a message queue or pub/sub system
    // For now, we'll use a simple in-memory broadcast
    console.log('Broadcasting real-time event:', event);

    // In a production environment, this would:
    // 1. Send to Redis pub/sub
    // 2. Use WebSocket server to broadcast to connected clients
    // 3. Or use a service like Pusher, Socket.io, etc.
  }
}

// Enhanced Real-time Analytics Hook
export function useRealtimeAnalytics(
  talentId: string,
  eventTypes: RealtimeEventType[] = ['new_event', 'metrics_updated', 'active_visitors_changed']
) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!talentId) return;

    const service = RealtimeAnalyticsService.getInstance();
    setConnectionStatus('connecting');

    const subscription: RealtimeSubscription = {
      talentId,
      eventTypes,
      callback: (event: RealtimeEvent) => {
        setLastEvent(event);

        // Update real-time data based on event type
        switch (event.type) {
          case 'new_event':
            setRealtimeData((prev: any) => ({
              ...prev,
              recentEvents: [event.data.event, ...(prev?.recentEvents || [])].slice(0, 10),
              lastUpdated: event.timestamp
            }));
            break;

          case 'metrics_updated':
            setRealtimeData((prev: any) => ({
              ...prev,
              metrics: event.data.metrics,
              lastUpdated: event.timestamp
            }));
            break;

          case 'active_visitors_changed':
            setRealtimeData((prev: any) => ({
              ...prev,
              activeVisitors: event.data.count,
              lastUpdated: event.timestamp
            }));
            break;
        }

        setIsLoading(false);
      }
    };

    const unsubscribe = service.subscribe(subscription);

    // Monitor connection status
    const statusInterval = setInterval(() => {
      const status = service.getConnectionStatus(talentId);
      setConnectionStatus(status);

      if (status === 'connected' && isLoading) {
        setIsLoading(false);
      }
    }, 1000);

    // Fetch initial data
    fetchInitialRealtimeData(talentId).then(data => {
      setRealtimeData(data);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [talentId, eventTypes]);

  return {
    connectionStatus,
    realtimeData,
    lastEvent,
    isLoading,
    isConnected: connectionStatus === 'connected'
  };
}

// Fetch initial real-time data
async function fetchInitialRealtimeData(talentId: string): Promise<any> {
  try {
    const response = await fetch(`/api/analytics/realtime?talentId=${encodeURIComponent(talentId)}`);
    if (!response.ok) throw new Error('Failed to fetch initial real-time data');

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching initial real-time data:', error);
    return null;
  }
}

// Real-time Performance Monitor Hook
export function usePerformanceMonitor(talentId: string) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (!talentId) return;

    const service = RealtimeAnalyticsService.getInstance();

    const subscription: RealtimeSubscription = {
      talentId,
      eventTypes: ['performance_alert', 'goal_achieved'],
      callback: (event: RealtimeEvent) => {
        switch (event.type) {
          case 'performance_alert':
            setAlerts(prev => [event.data, ...prev].slice(0, 5)); // Keep last 5 alerts
            break;
          case 'goal_achieved':
            setAlerts(prev => [{
              type: 'success',
              message: `Goal achieved: ${event.data.goalName}`,
              timestamp: event.timestamp
            }, ...prev].slice(0, 5));
            break;
        }
      }
    };

    const unsubscribe = service.subscribe(subscription);

    return () => {
      unsubscribe();
    };
  }, [talentId]);

  return { alerts, metrics };
}

// Real-time Visitor Tracking Hook
export function useVisitorTracking(talentId: string) {
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);

  useEffect(() => {
    if (!talentId) return;

    const service = RealtimeAnalyticsService.getInstance();

    const subscription: RealtimeSubscription = {
      talentId,
      eventTypes: ['new_event', 'active_visitors_changed'],
      callback: (event: RealtimeEvent) => {
        switch (event.type) {
          case 'new_event':
            if (event.data.event.eventType === 'profile_view') {
              setRecentVisitors(prev => [
                {
                  sessionId: event.data.event.sessionId,
                  timestamp: event.data.event.timestamp,
                  location: event.data.event.locationInfo.country,
                  device: event.data.event.deviceInfo.deviceType
                },
                ...prev
              ].slice(0, 10));
            }
            break;
          case 'active_visitors_changed':
            setActiveVisitors(event.data.count);
            break;
        }
      }
    };

    const unsubscribe = service.subscribe(subscription);

    return () => {
      unsubscribe();
    };
  }, [talentId]);

  return { activeVisitors, recentVisitors };
}

import { useState, useEffect } from 'react';
