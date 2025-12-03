"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Award, Check, X } from "lucide-react";

interface TierBenefit {
  id: string;
  tier_name: 'silver' | 'gold' | 'black';
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BenefitFormData {
  tier_name: 'silver' | 'gold' | 'black';
  title: string;
  description: string;
}

export function TierBenefitsManager() {
  const [benefits, setBenefits] = useState<TierBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<TierBenefit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterTier, setFilterTier] = useState<'all' | 'silver' | 'gold' | 'black'>('all');

  const [formData, setFormData] = useState<BenefitFormData>({
    tier_name: 'silver',
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchBenefits();
  }, []);

  async function fetchBenefits() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tier-benefits?active_only=false');
      const data = await response.json();
      setBenefits(data);
    } catch (error) {
      console.error('Error fetching tier benefits:', error);
      setError('Failed to load tier benefits');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBenefit() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/tier-benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_name: formData.tier_name,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          is_active: true
        })
      });

      if (response.ok) {
        setSuccess('Benefit added successfully!');
        setIsAddDialogOpen(false);
        resetForm();
        await fetchBenefits();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add benefit');
      }
    } catch (error) {
      console.error('Add benefit error:', error);
      setError('Failed to add benefit');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditBenefit() {
    if (!selectedBenefit) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/admin/tier-benefits/${selectedBenefit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined
        })
      });

      if (response.ok) {
        setSuccess('Benefit updated successfully!');
        setIsEditDialogOpen(false);
        setSelectedBenefit(null);
        resetForm();
        await fetchBenefits();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update benefit');
      }
    } catch (error) {
      console.error('Update benefit error:', error);
      setError('Failed to update benefit');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleBenefit(benefit: TierBenefit) {
    try {
      const response = await fetch(`/api/admin/tier-benefits/${benefit.id}`, {
        method: 'PATCH'
      });

      if (response.ok) {
        setSuccess(`Benefit ${benefit.is_active ? 'deactivated' : 'activated'} successfully!`);
        await fetchBenefits();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to toggle benefit');
      }
    } catch (error) {
      console.error('Toggle benefit error:', error);
      setError('Failed to toggle benefit');
    }
  }

  async function handleDeleteBenefit() {
    if (!selectedBenefit) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/tier-benefits/${selectedBenefit.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Benefit deleted successfully!');
        setIsDeleteDialogOpen(false);
        setSelectedBenefit(null);
        await fetchBenefits();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete benefit');
      }
    } catch (error) {
      console.error('Delete benefit error:', error);
      setError('Failed to delete benefit');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormData({
      tier_name: 'silver',
      title: '',
      description: ''
    });
  }

  function openEditDialog(benefit: TierBenefit) {
    setSelectedBenefit(benefit);
    setFormData({
      tier_name: benefit.tier_name,
      title: benefit.title,
      description: benefit.description || ''
    });
    setIsEditDialogOpen(true);
  }

  function openDeleteDialog(benefit: TierBenefit) {
    setSelectedBenefit(benefit);
    setIsDeleteDialogOpen(true);
  }

  function getTierBadge(tier: string) {
    switch (tier) {
      case 'black':
        return 'bg-black text-white';
      case 'gold':
        return 'bg-gold text-white';
      case 'silver':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  }

  // Filter benefits
  const filteredBenefits = filterTier === 'all'
    ? benefits
    : benefits.filter(b => b.tier_name === filterTier);

  // Group by tier for stats
  const benefitsByTier = {
    silver: benefits.filter(b => b.tier_name === 'silver' && b.is_active).length,
    gold: benefits.filter(b => b.tier_name === 'gold' && b.is_active).length,
    black: benefits.filter(b => b.tier_name === 'black' && b.is_active).length
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Tier Benefits Management</h2>
          <p className="text-gray-600">Configure benefits for each VIP tier</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
          className="bg-gold hover:bg-gold/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Benefit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Benefits</div>
          <div className="text-2xl font-bold text-gray-900">
            {benefits.filter(b => b.is_active).length}
          </div>
        </div>
        <div className="bg-gray-200/50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Silver Tier</div>
          <div className="text-2xl font-bold text-gray-600">{benefitsByTier.silver}</div>
        </div>
        <div className="bg-gold/10 rounded-lg p-4">
          <div className="text-sm text-gray-600">Gold Tier</div>
          <div className="text-2xl font-bold text-gold">{benefitsByTier.gold}</div>
        </div>
        <div className="bg-black/5 rounded-lg p-4">
          <div className="text-sm text-gray-600">Black Tier</div>
          <div className="text-2xl font-bold text-black">{benefitsByTier.black}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={filterTier} onValueChange={(value: any) => setFilterTier(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="black">Black</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded mb-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading benefits...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Tier</th>
                <th className="text-left py-3 px-4">Title</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBenefits.map((benefit) => (
                <tr key={benefit.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Badge className={`${getTierBadge(benefit.tier_name)} capitalize`}>
                      {benefit.tier_name}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-medium">{benefit.title}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-md truncate">
                    {benefit.description || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleBenefit(benefit)}
                      className="flex items-center gap-1"
                    >
                      {benefit.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                          <X className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(benefit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(benefit)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBenefits.length === 0 && (
            <div className="text-center py-12">
              <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {filterTier === 'all'
                  ? 'No benefits configured yet. Add your first benefit!'
                  : `No benefits for ${filterTier} tier yet`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Benefit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Benefit</DialogTitle>
            <DialogDescription>
              Create a new benefit for a VIP tier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tier *</label>
              <Select
                value={formData.tier_name}
                onValueChange={(value: any) => setFormData({ ...formData, tier_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Priority Entry"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Skip the line with priority entry to all events"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBenefit}
              disabled={saving || !formData.title.trim()}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {saving ? 'Adding...' : 'Add Benefit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Benefit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Benefit</DialogTitle>
            <DialogDescription>
              Update the benefit details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tier</label>
              <Badge className={`${getTierBadge(formData.tier_name)} capitalize`}>
                {formData.tier_name}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">Tier cannot be changed</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Priority Entry"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Skip the line with priority entry to all events"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedBenefit(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditBenefit}
              disabled={saving || !formData.title.trim()}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {saving ? 'Updating...' : 'Update Benefit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the benefit "{selectedBenefit?.title}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBenefit(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBenefit}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
