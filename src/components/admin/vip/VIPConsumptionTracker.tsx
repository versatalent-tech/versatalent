"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, ShoppingCart, TrendingUp } from "lucide-react";

interface VIPUser {
  id: string;
  name: string;
  email: string;
}

interface Consumption {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export function VIPConsumptionTracker() {
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [users, setUsers] = useState<VIPUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    currency: 'EUR',
    description: ''
  });

  useEffect(() => {
    fetchConsumptions();
    fetchUsers();
  }, []);

  async function fetchConsumptions() {
    try {
      setLoading(true);
      const response = await fetch('/api/vip/consumption');
      const data = await response.json();
      setConsumptions(data);
    } catch (error) {
      console.error('Error fetching consumptions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/api/nfc/users?role=vip');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function handleAddConsumption() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/vip/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: formData.user_id,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          description: formData.description
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Consumption recorded! ${data.points.awarded} points awarded.`);
        setIsAddDialogOpen(false);
        resetForm();
        await fetchConsumptions();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to record consumption');
      }
    } catch (error) {
      console.error('Add consumption error:', error);
      setError('Failed to record consumption');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormData({
      user_id: '',
      amount: '',
      currency: 'EUR',
      description: ''
    });
  }

  // Calculate stats
  const stats = {
    total: consumptions.length,
    totalAmount: consumptions.reduce((sum, c) => sum + c.amount, 0),
    avgAmount: consumptions.length > 0
      ? consumptions.reduce((sum, c) => sum + c.amount, 0) / consumptions.length
      : 0
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Consumption Tracking</h2>
          <p className="text-gray-600">Record spending and automatically award points</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
          className="bg-gold hover:bg-gold/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Consumption
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Transactions</div>
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">
            €{stats.totalAmount.toFixed(2)}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Average Spending</div>
          <div className="text-2xl font-bold text-purple-600">
            €{stats.avgAmount.toFixed(2)}
          </div>
        </div>
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
        <div className="text-center py-8">Loading consumptions...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">VIP Member</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-right py-3 px-4">Points</th>
              </tr>
            </thead>
            <tbody>
              {consumptions.slice(0, 50).map((consumption) => (
                <tr key={consumption.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(consumption.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{consumption.user?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{consumption.user?.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {consumption.description || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">
                    €{consumption.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-gold font-semibold">
                      <TrendingUp className="h-4 w-4" />
                      +{Math.floor(consumption.amount / 3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Consumption Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Consumption</DialogTitle>
            <DialogDescription>
              Record a purchase/spending and automatically award points (1 point per 3 euros)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">VIP Member *</label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select VIP member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Amount * (€)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g., 150.00"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., VIP lounge drinks and food"
                rows={3}
              />
            </div>

            {formData.amount && parseFloat(formData.amount) > 0 && (
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  Points to be awarded:{' '}
                  <span className="font-bold text-gold">
                    +{Math.floor(parseFloat(formData.amount) / 3)} points
                  </span>
                </div>
              </div>
            )}
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
              onClick={handleAddConsumption}
              disabled={saving || !formData.user_id || !formData.amount}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {saving ? 'Recording...' : 'Record Consumption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
