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
import { Plus, Edit, Trash2, CreditCard, Power, PowerOff, Ban, CheckCircle, UserX, RefreshCw, Nfc } from "lucide-react";
import { NFCReaderStatusIndicator } from "./NFCReaderStatus";

interface NFCCard {
  id: string;
  card_uid: string;
  user_id: string;
  type: string;
  is_active: boolean;
  status: 'active' | 'inactive' | 'blocked';
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

type CardType = 'artist' | 'vip' | 'staff' | 'guest';
type CardStatus = 'active' | 'inactive' | 'blocked';

const CARD_TYPE_CONFIG: Record<CardType, { label: string; color: string }> = {
  artist: { label: 'Artist', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  vip: { label: 'VIP', color: 'bg-gold/20 text-gold border-gold/30' },
  staff: { label: 'Staff', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  guest: { label: 'Guest', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};

const CARD_STATUS_CONFIG: Record<CardStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: PowerOff },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800 border-red-200', icon: Ban },
};

export function NFCCardsManager() {
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [users, setUsers] = useState<NFCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<NFCCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scannedUID, setScannedUID] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    card_uid: "",
    user_id: "",
    type: "vip" as CardType,
    status: "active" as CardStatus,
    metadata: {}
  });

  // Filter states
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCards();
    fetchUsers();
  }, []);

  async function fetchCards() {
    try {
      setLoading(true);
      const response = await fetch('/api/nfc/cards');
      const data = await response.json();
      // Ensure status field exists (backwards compatibility)
      const cardsWithStatus = data.map((card: NFCCard) => ({
        ...card,
        status: card.status || (card.is_active ? 'active' : 'inactive')
      }));
      setCards(cardsWithStatus);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError('Failed to load NFC cards');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/api/nfc/users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  async function handleCreate() {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...formData,
        is_active: formData.status === 'active'
      };

      const response = await fetch('/api/nfc/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    } catch (err) {
      console.error('Create card error:', err);
      setError('Failed to create NFC card');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingCard) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        card_uid: formData.card_uid,
        user_id: formData.user_id || null,
        type: formData.type,
        status: formData.status,
        is_active: formData.status === 'active'
      };

      const response = await fetch(`/api/nfc/cards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess('NFC card updated successfully');
        setIsEditDialogOpen(false);
        setEditingCard(null);
        resetForm();
        await fetchCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update NFC card');
      }
    } catch (err) {
      console.error('Update card error:', err);
      setError('Failed to update NFC card');
    } finally {
      setSaving(false);
    }
  }

  async function updateCardStatus(cardId: string, newStatus: CardStatus) {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/nfc/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          is_active: newStatus === 'active'
        })
      });

      if (response.ok) {
        setSuccess(`Card ${newStatus === 'blocked' ? 'blocked' : newStatus === 'active' ? 'activated' : 'deactivated'}`);
        await fetchCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError('Failed to update card status. ' + (data.error || ''));
      }
    } catch (err) {
      console.error('Update status error:', err);
      setError('Failed to update card status');
    } finally {
      setSaving(false);
    }
  }

  async function unassignCard(cardId: string) {
    if (!confirm('Are you sure you want to unassign this card from the user?')) return;

    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/nfc/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: null })
      });

      if (response.ok) {
        setSuccess('Card unassigned from user');
        await fetchCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError('Failed to unassign card. ' + (data.error || ''));
      }
    } catch (err) {
      console.error('Unassign card error:', err);
      setError('Failed to unassign card');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cardId: string) {
    if (!confirm('Are you sure you want to delete this NFC card? This action cannot be undone.')) return;

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
    } catch (err) {
      console.error('Delete card error:', err);
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
      status: "active",
      metadata: {}
    });
    setScannedUID(null);
  }

  function openEditDialog(card: NFCCard) {
    setEditingCard(card);
    setFormData({
      card_uid: card.card_uid,
      user_id: card.user_id || "",
      type: card.type as CardType,
      status: card.status || (card.is_active ? 'active' : 'inactive'),
      metadata: {}
    });
    setIsEditDialogOpen(true);
  }

  function handleCardScanned(uid: string) {
    setScannedUID(uid);
    setFormData(prev => ({ ...prev, card_uid: uid }));
    setSuccess(`Card scanned: ${uid}`);
    setTimeout(() => setSuccess(null), 3000);
  }

  // Filter cards
  const filteredCards = cards.filter(card => {
    const matchesType = filterType === 'all' || card.type === filterType;
    const matchesStatus = filterStatus === 'all' || card.status === filterStatus;
    const matchesSearch = searchQuery === '' ||
      card.card_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const getStatusActions = (card: NFCCard) => {
    const actions: { status: CardStatus; label: string; icon: typeof Power; color: string }[] = [];

    if (card.status !== 'active') {
      actions.push({ status: 'active', label: 'Activate', icon: Power, color: 'text-green-600' });
    }
    if (card.status !== 'inactive') {
      actions.push({ status: 'inactive', label: 'Deactivate', icon: PowerOff, color: 'text-gray-600' });
    }
    if (card.status !== 'blocked') {
      actions.push({ status: 'blocked', label: 'Block', icon: Ban, color: 'text-red-600' });
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      {/* NFC Reader Status */}
      <NFCReaderStatusIndicator
        onCardScanned={handleCardScanned}
        showControls={true}
      />

      {/* Cards Management */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">NFC Cards ({filteredCards.length})</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCards}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add NFC Card
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by UID, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Card Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="artist">Artist</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 text-red-900 font-bold">×</button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded mb-4">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading NFC cards...</div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {cards.length === 0 ? 'No NFC cards registered yet.' : 'No cards match your filters.'}
          </div>
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
                {filteredCards.map((card) => {
                  const typeConfig = CARD_TYPE_CONFIG[card.type as CardType] || CARD_TYPE_CONFIG.vip;
                  const statusConfig = CARD_STATUS_CONFIG[card.status] || CARD_STATUS_CONFIG.inactive;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={card.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                            {card.card_uid}
                          </code>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {card.user?.name ? (
                          <div>
                            <div className="font-medium">{card.user.name}</div>
                            <div className="text-sm text-gray-500">{card.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end flex-wrap">
                          {/* Quick status actions */}
                          {getStatusActions(card).map(action => (
                            <Button
                              key={action.status}
                              variant="ghost"
                              size="sm"
                              onClick={() => updateCardStatus(card.id, action.status)}
                              title={action.label}
                              className={action.color}
                              disabled={saving}
                            >
                              <action.icon className="h-4 w-4" />
                            </Button>
                          ))}

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(card)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Unassign */}
                          {card.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unassignCard(card.id)}
                              title="Unassign from user"
                              className="text-amber-600"
                              disabled={saving}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(card.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Nfc className="h-5 w-5" />
              Register New NFC Card
            </DialogTitle>
            <DialogDescription>
              Scan a card or enter the UID manually to register it
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Scanned UID indicator */}
            {scannedUID && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <span className="text-sm text-green-700">
                  Card scanned: <code className="font-mono bg-green-100 px-1 rounded">{scannedUID}</code>
                </span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Card UID *</label>
              <Input
                value={formData.card_uid}
                onChange={(e) => setFormData({ ...formData, card_uid: e.target.value })}
                placeholder="Scan or enter card UID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Place card on reader to auto-fill, or enter manually
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Assign to User</label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No User (Unassigned)</SelectItem>
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
                onValueChange={(value) => setFormData({ ...formData, type: value as CardType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Initial Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as CardStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
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
              disabled={!formData.card_uid || saving}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {saving ? 'Creating...' : 'Register Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit NFC Card</DialogTitle>
            <DialogDescription>
              Update card details and assignment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Card UID</label>
              <Input
                value={formData.card_uid}
                onChange={(e) => setFormData({ ...formData, card_uid: e.target.value })}
                placeholder="Card UID"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Assigned User</label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No User (Unassigned)</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Card Type</label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as CardType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as CardStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingCard(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.card_uid || saving}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
