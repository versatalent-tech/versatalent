"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Search, User, X, Plus, Minus, CreditCard, Trash2 } from "lucide-react";
import type { Product } from "@/lib/db/types";
import { NFCReaderButton } from "@/components/pos/NFCReader";
import { StripeCheckout } from "@/components/pos/StripeCheckout";

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  tier?: string;
  points?: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pos/products?activeOnly=true', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/pos/products?categoriesOnly=true', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price_cents * item.quantity), 0);
  };

  const handleCustomerLinked = (linkedCustomer: Customer) => {
    setCustomer(linkedCustomer);
    setSuccess(`Customer linked: ${linkedCustomer.name}`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const unlinkCustomer = () => {
    setCustomer(null);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Create order
      const orderResponse = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_user_id: customer?.id || null,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity
          }))
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const order = await orderResponse.json();
      setCurrentOrderId(order.id);

      // Check if Stripe is configured
      const hasStripe = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (hasStripe) {
        // Show Stripe checkout
        setShowCheckout(true);
      } else {
        // Development mode: Mark order as paid immediately
        console.log('Stripe not configured, marking order as paid for development');

        const updateResponse = await fetch(`/api/pos/orders/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'paid' })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update order');
        }

        // Success!
        handlePaymentSuccess('dev-mode');
      }

    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Checkout failed. Please try again.');
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setShowCheckout(false);
    setProcessingPayment(false);
    clearCart();
    setCustomer(null);
    setCurrentOrderId(null);
    setSuccess('Payment successful! Order complete.');
    setTimeout(() => setSuccess(null), 5000);
  };

  const handlePaymentCancel = () => {
    setShowCheckout(false);
    setProcessingPayment(false);
    setError('Payment cancelled');
    setTimeout(() => setError(null), 3000);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-8">
        <div className="container px-4 mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">
            Point of <span className="text-gold">Sale</span>
          </h1>
          <p className="text-gray-300">Process sales and manage orders</p>
        </div>
      </section>

      {/* Messages */}
      {(error || success) && (
        <div className="container px-4 mx-auto mt-4">
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
        </div>
      )}

      <div className="container px-4 mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                  size="sm"
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    size="sm"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-12">Loading products...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => addToCart(product)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gold">
                          €{(product.price_cents / 100).toFixed(2)}
                        </span>
                        <Plus className="h-5 w-5 text-gray-400" />
                      </div>
                      {product.category && (
                        <Badge variant="outline" className="text-xs mt-2">
                          {product.category}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Customer Info */}
                <div className="mb-4">
                  {customer ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="font-semibold text-sm">{customer.name}</p>
                            <p className="text-xs text-gray-600">{customer.email}</p>
                            {customer.tier && (
                              <Badge className="text-xs mt-1">{customer.tier}</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={unlinkCustomer}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <NFCReaderButton onCustomerLinked={handleCustomerLinked} />
                  )}
                </div>

                {/* Cart Items */}
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Cart is empty</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-600">
                              €{(item.product.price_cents / 100).toFixed(2)} each
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-bold">
                            €{((item.product.price_cents * item.quantity) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total and Checkout */}
                {cart.length > 0 && (
                  <>
                    <div className="border-t pt-4 mb-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-gold">€{(getTotal() / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="w-full bg-gold hover:bg-gold/90 text-white"
                        onClick={handleCheckout}
                        disabled={processingPayment}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {processingPayment ? 'Processing...' : 'Checkout'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={clearCart}
                        disabled={processingPayment}
                      >
                        Clear Cart
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Stripe Checkout Dialog */}
      {showCheckout && currentOrderId && (
        <StripeCheckout
          orderId={currentOrderId}
          amount={getTotal()}
          currency="EUR"
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </MainLayout>
  );
}
