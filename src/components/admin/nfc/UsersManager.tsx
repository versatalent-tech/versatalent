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
import { Plus, Edit, Trash2, User, Mail, Receipt } from "lucide-react";
import PurchaseHistory from "@/components/admin/PurchaseHistory";

interface NFCUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  talent_id?: string;
  created_at: string;
}

export function UsersManager() {
  const [users, setUsers] = useState<NFCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<NFCUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "vip",
    avatar_url: "",
    talent_id: ""
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await fetch('/api/nfc/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/nfc/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('User created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        await fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      setError('Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selectedUser) return;

    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/nfc/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('User updated successfully');
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        resetForm();
        await fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update user. ' + (data.error || ''));
      }
    } catch (error) {
      console.error('Update user error:', error);
      setError('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/nfc/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('User deleted successfully');
        await fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError('Failed to delete user. ' + (data.error || ''));
      }
    } catch (error) {
      console.error('Delete user error:', error);
      setError('Failed to delete user. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "vip",
      avatar_url: "",
      talent_id: ""
    });
  }

  function openEditDialog(user: NFCUser) {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      avatar_url: user.avatar_url || "",
      talent_id: user.talent_id || ""
    });
    setIsEditDialogOpen(true);
  }

  function openPurchaseHistory(user: NFCUser) {
    setSelectedUser(user);
    setIsPurchaseHistoryOpen(true);
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Users ({users.length})</h2>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
          className="bg-gold hover:bg-gold/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
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
        <div className="text-center py-8">Loading users...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Talent ID</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <Badge
                      className={`
                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}
                        ${user.role === 'artist' ? 'bg-blue-100 text-blue-800' : ''}
                        ${user.role === 'vip' ? 'bg-gold/20 text-gold' : ''}
                        ${user.role === 'staff' ? 'bg-gray-100 text-gray-800' : ''}
                      `}
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {user.talent_id || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPurchaseHistory(user)}
                        title="View purchase history"
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedUser(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? 'Add New User' : 'Edit User'}
            </DialogTitle>
            <DialogDescription>
              {isCreateDialogOpen
                ? 'Create a new user for the NFC system'
                : 'Update user information'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            {isCreateDialogOpen && (
              <div>
                <label className="text-sm font-medium mb-2 block">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank for no password"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Role *</label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Talent ID</label>
              <Input
                value={formData.talent_id}
                onChange={(e) => setFormData({ ...formData, talent_id: e.target.value })}
                placeholder="Link to existing talent profile"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedUser(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isCreateDialogOpen ? handleCreate : handleUpdate}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {isCreateDialogOpen ? 'Create User' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase History Dialog */}
      <Dialog
        open={isPurchaseHistoryOpen}
        onOpenChange={(open) => {
          setIsPurchaseHistoryOpen(open);
          if (!open) {
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Purchase History - {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Complete purchase history and statistics for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <PurchaseHistory userId={selectedUser.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
