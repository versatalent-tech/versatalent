"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit, Trash2, CreditCard, Power, PowerOff } from "lucide-react";

interface NFCCard {
  id: string;
  card_uid: string;
  user_id: string;
  type: string;
  is_active: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface NFCUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function NFCCardsManager() {
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [users, setUsers] = useState<NFCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    card_uid: "",
    user_id: "",
    type: "vip",
    metadata: {}
  });

  useEffect(() => {
    fetchCards();
    fetchUsers();
  }, []);

  async function fetchCards() {
    try {
      setLoading(true);
      const response = await fetch('/api/nfc/cards');
      const data = await response.json();
      setCards(data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/api/nfc/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function handleCreate() {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/nfc/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('NFC card created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        await fetchCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create NFC card');
      }
    } catch (error) {
      console.error('Create card error:', error);
      setError('Failed to create NFC card');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCardStatus(cardId: string, currentStatus: boolean) {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/nfc/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        setSuccess(`Card ${!currentStatus ? 'activated' : 'deactivated'}`);
        await fetchCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError('Failed to update card status. ' + (data.error || ''));
      }
    } catch (error) {
      console.error('Toggle card status error:', error);
      setError('Failed to update card status');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cardId: string) {
    if (!confirm('Are you sure you want to delete this NFC card?')) return;

    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/nfc/cards/${cardId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('NFC card deleted successfully');
        await fetchCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError('Failed to delete NFC card. ' + (data.error || ''));
      }
    } catch (error) {
      console.error('Delete card error:', error);
      setError('Failed to delete NFC card');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormData({
      card_uid: "",
      user_id: "",
      type: "vip",
      metadata: {}
    });
  }

  function generateCardUID() {
    return `CARD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">NFC Cards ({cards.length})</h2>
        <Button
          onClick={() => {
            resetForm();
            setFormData({ ...formData, card_uid: generateCardUID() });
            setIsCreateDialogOpen(true);
          }}
          className="bg-gold hover:bg-gold/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add NFC Card
        </Button>
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
        <div className="text-center py-8">Loading NFC cards...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Card UID</th>
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {card.card_uid}
                      </code>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{card.user.name}</div>
                      <div className="text-sm text-gray-500">{card.user.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={`
                        ${card.type === 'artist' ? 'bg-blue-100 text-blue-800' : ''}
                        ${card.type === 'vip' ? 'bg-gold/20 text-gold' : ''}
                        ${card.type === 'staff' ? 'bg-gray-100 text-gray-800' : ''}
                      `}
                    >
                      {card.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={card.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    >
                      {card.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCardStatus(card.id, card.is_active)}
                        title={card.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {card.is_active ? (
                          <PowerOff className="h-4 w-4 text-red-600" />
                        ) : (
                          <Power className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(card.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New NFC Card</DialogTitle>
            <DialogDescription>
              Assign an NFC card to a user for access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Card UID *</label>
              <Input
                value={formData.card_uid}
                onChange={(e) => setFormData({ ...formData, card_uid: e.target.value })}
                placeholder="CARD-123456"
              />
              <p className="text-xs text-gray-500 mt-1">
                This should match the UID programmed on the physical NFC card
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Assign to User *</label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
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
              <label className="text-sm font-medium mb-2 block">Card Type *</label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              Create NFC Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
