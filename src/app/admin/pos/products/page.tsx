"use client";

import { useState, useEffect } from "react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff } from "lucide-react";
import type { Product } from "@/lib/db/types";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_cents: 0,
    category: '',
    stock_quantity: 0,
    is_active: true
  });

  useEffect(() => {
    fetchProducts();
  }, [showInactive]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pos/products?activeOnly=${!showInactive}`, {
        credentials: 'include' // Ensure cookies are sent
      });

      // Log the response for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Get the raw text first to see what we're getting
      const text = await response.text();
      console.log('Response text:', text.substring(0, 200)); // Log first 200 chars

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setError(`Invalid response from server: ${text.substring(0, 100)}`);
        return;
      }

      if (!response.ok) {
        // Handle error responses
        if (response.status === 401) {
          setError('Not authenticated. Please login again.');
          // Redirect to login after a moment
          setTimeout(() => {
            window.location.href = '/admin/login?returnTo=' + encodeURIComponent(window.location.pathname);
          }, 2000);
        } else {
          setError(data.error || data.details || 'Failed to load products');
        }
        return;
      }

      setProducts(data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to load products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/pos/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create product');
      }

      await fetchProducts();
      setIsCreateDialogOpen(false);
      resetForm();
      setSuccess('Product created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProduct) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/pos/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update product');
      }

      await fetchProducts();
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      resetForm();
      setSuccess('Product updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/pos/products/${selectedProduct.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      await fetchProducts();
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      setSuccess('Product deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price_cents: product.price_cents,
      category: product.category || '',
      stock_quantity: product.stock_quantity,
      is_active: product.is_active
    });
    setError(null);
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_cents: 0,
      category: '',
      stock_quantity: 0,
      is_active: true
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
                  Product <span className="text-gold">Management</span>
                </h1>
                <p className="text-gray-300">Manage POS products and inventory</p>
              </div>
              <div className="flex gap-2">
                <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
                <Button
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(true);
                  }}
                  className="bg-gold hover:bg-gold/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Messages */}
        {(error || success) && (
          <section className="container px-4 mx-auto mt-4">
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded">
                {success}
              </div>
            )}
          </section>
        )}

        {/* Products List */}
        <section className="py-8">
          <div className="container px-4 mx-auto">
            <div className="mb-4 flex justify-end">
              <Button
                variant={showInactive ? "default" : "outline"}
                onClick={() => setShowInactive(!showInactive)}
                size="sm"
              >
                {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                {showInactive ? 'Show All' : 'Hide Inactive'}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Loading products...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(product => (
                  <div
                    key={product.id}
                    className={`bg-white rounded-lg border p-4 ${!product.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        {product.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                      {!product.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>

                    {product.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-gold">
                        €{(product.price_cents / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600">
                        Stock: {product.stock_quantity}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Create/Edit Dialog */}
        <Dialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedProduct(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isCreateDialogOpen ? 'Add Product' : 'Edit Product'}
              </DialogTitle>
              <DialogDescription>
                {isCreateDialogOpen ? 'Create a new product' : 'Update product details'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Price (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={(formData.price_cents / 100).toFixed(2)}
                  onChange={(e) => setFormData({ ...formData, price_cents: Math.round(parseFloat(e.target.value) * 100) })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Drinks, Food, Tickets"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Stock Quantity</label>
                <Input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_active" className="text-sm">Active (visible in POS)</label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={isCreateDialogOpen ? handleCreate : handleUpdate}
                disabled={saving}
                className="bg-gold hover:bg-gold/90 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {selectedProduct && (
              <div className="bg-gray-50 rounded-lg p-4 my-4">
                <p className="font-semibold">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">
                  €{(selectedProduct.price_cents / 100).toFixed(2)}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
