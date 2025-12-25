'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown,
  ChevronRight,
  Receipt,
  TrendingUp,
  ShoppingCart,
  Euro,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PurchaseHistoryProps {
  userId: string;
}

interface PurchaseItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

interface Order {
  id: string;
  order_date: Date;
  total_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id?: string;
  items: PurchaseItem[];
  notes?: string;
  staff_user?: {
    id: string;
    name: string;
  };
}

interface Stats {
  total_orders: number;
  total_items_purchased: number;
  total_spent_cents: number;
  average_order_value_cents: number;
  most_purchased_items: Array<{
    product_name: string;
    total_quantity: number;
    total_spent_cents: number;
  }>;
  first_purchase_date?: Date;
  last_purchase_date?: Date;
}

interface PurchaseHistoryData {
  user_id: string;
  user_name: string;
  user_email: string;
  stripe_customer_id?: string;
  total_orders: number;
  total_spent_cents: number;
  currency: string;
  orders: Order[];
  stats?: Stats;
}

export default function PurchaseHistory({ userId }: PurchaseHistoryProps) {
  const [data, setData] = useState<PurchaseHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPurchaseHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchPurchaseHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/users/${userId}/purchases`);

      if (!response.ok) {
        throw new Error('Failed to fetch purchase history');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching purchase history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatCurrency = (cents: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500">Error: {error}</p>
          <Button onClick={fetchPurchaseHistory} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No purchase history found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_orders}</div>
            {data.stats?.first_purchase_date && (
              <p className="text-xs text-muted-foreground mt-1">
                First purchase{' '}
                {formatDistanceToNow(new Date(data.stats.first_purchase_date), {
                  addSuffix: true,
                })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.total_spent_cents, data.currency)}
            </div>
            {data.stats && (
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {formatCurrency(data.stats.average_order_value_cents, data.currency)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Purchased</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats?.total_items_purchased || 0}
            </div>
            {data.stats?.last_purchase_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Last purchase{' '}
                {formatDistanceToNow(new Date(data.stats.last_purchase_date), {
                  addSuffix: true,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stripe Customer Info */}
      {data.stripe_customer_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Stripe Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {data.stripe_customer_id}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.open(
                    `https://dashboard.stripe.com/customers/${data.stripe_customer_id}`,
                    '_blank'
                  );
                }}
              >
                View in Stripe
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Purchased Items */}
      {data.stats && data.stats.most_purchased_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Most Purchased Items</CardTitle>
            <CardDescription>Top items by quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.stats.most_purchased_items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.total_quantity}x</Badge>
                    <span className="font-medium">{item.product_name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(item.total_spent_cents, data.currency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>
            {data.total_orders} {data.total_orders === 1 ? 'order' : 'orders'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.orders.length === 0 ? (
            <p className="text-muted-foreground">No orders found.</p>
          ) : (
            <div className="space-y-3">
              {data.orders.map((order) => {
                const isExpanded = expandedOrders.has(order.id);

                return (
                  <div
                    key={order.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Order Header */}
                    <button
                      onClick={() => toggleOrder(order.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Order #{order.id.slice(0, 8)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {order.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(order.order_date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {formatCurrency(order.total_cents, order.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.items.length} item{order.items.length !== 1 && 's'}
                        </div>
                      </div>
                    </button>

                    {/* Order Details (Expandable) */}
                    {isExpanded && (
                      <div className="border-t p-4 bg-muted/20">
                        {/* Order Items */}
                        <div className="space-y-2 mb-4">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {item.quantity}x
                                </Badge>
                                <span>{item.product_name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">
                                  {formatCurrency(item.unit_price_cents, order.currency)} each
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(item.line_total_cents, order.currency)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Metadata */}
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t text-xs">
                          {order.staff_user && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Served by: {order.staff_user.name}
                              </span>
                            </div>
                          )}
                          {order.stripe_payment_intent_id && (
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              <a
                                href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View in Stripe
                              </a>
                            </div>
                          )}
                          {order.notes && (
                            <div className="col-span-2 text-muted-foreground">
                              Note: {order.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
