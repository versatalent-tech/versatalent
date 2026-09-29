"use client";

import { useState, useEffect } from "react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, User, Calendar, CreditCard } from "lucide-react";
import type { POSOrder, OrderStatus } from "@/lib/db/types";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [stats, setStats] = useState<Record<OrderStatus, number>>({
    pending: 0,
    paid: 0,
    cancelled: 0,
    failed: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? '/api/pos/orders'
        : `/api/pos/orders?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/pos/orders?counts=true');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={styles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        {/* Header */}
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12">
          <div className="container px-4 mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  POS <span className="text-gold">Orders</span>
                </h1>
                <p className="text-gray-300">View and manage point of sale transactions</p>
              </div>
              <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black w-fit" />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-6 border-b bg-gray-50">
          <div className="container px-4 mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-600 mb-1">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-600 mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-4 border-b bg-gray-50">
          <div className="container px-4 mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Recent Orders</h2>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Orders List */}
        <section className="py-8">
          <div className="container px-4 mx-auto">
            {loading ? (
              <div className="text-center py-12">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-lg border p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-gray-600">
                            #{order.id.slice(0, 8)}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.created_at)}
                          </div>
                          {order.customer_user_id && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              Customer linked
                            </div>
                          )}
                          {order.stripe_payment_intent_id && (
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-4 w-4" />
                              Stripe
                            </div>
                          )}
                        </div>

                        {order.notes && (
                          <p className="text-sm text-gray-600 mt-2">{order.notes}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-gold">
                          €{(order.total_cents / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{order.currency}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
