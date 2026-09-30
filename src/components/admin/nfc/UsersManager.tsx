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
import { Plus, Edit, Trash2, User, Mail, Receipt, Download } from "lucide-react";
import PurchaseHistory from "@/components/admin/PurchaseHistory";
import { VIPDetailsFields, EMPTY_VIP_PROFILE } from "@/components/admin/nfc/VIPDetailsFields";
import { AGE_RANGES, type VIPProfileInput } from "@/lib/vip-profile";

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
  const [vipProfile, setVipProfile] = useState<VIPProfileInput>(EMPTY_VIP_PROFILE);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({ consent: "any", age_range: "any", city: "" });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await fetch('/api/nfc/users');
      const data = await response.json();
      // An error response (e.g. expired session) is an object, not a list
      if (!response.ok || !Array.isArray(data)) {
        setUsers([]);
        setError(response.status === 401 ? 'Your session has expired. Please log in again.' : 'Failed to load users');
        return;
      }
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Save VIP details after the user itself is saved. Returns false (and
   * shows an error) if it failed.
   */
  async function saveVipProfile(userId: string): Promise<boolean> {
    const response = await fetch(`/api/vip/profiles/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vipProfile)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(`User saved, but VIP details failed: ${data.error || 'unknown error'}`);
      return false;
    }
    return true;
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
        const created = await response.json();
        if (formData.role === 'vip' && !(await saveVipProfile(created.id))) {
          await fetchUsers();
          return;
        }
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
        if (formData.role === 'vip' && !(await saveVipProfile(selectedUser.id))) {
          await fetchUsers();
          return;
        }
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
    setVipProfile(EMPTY_VIP_PROFILE);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "vip",
      avatar_url: "",
      talent_id: ""
    });
  }

  async function openEditDialog(user: NFCUser) {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      avatar_url: user.avatar_url || "",
      talent_id: user.talent_id || ""
    });
    setVipProfile(EMPTY_VIP_PROFILE);
    setIsEditDialogOpen(true);

    if (user.role === 'vip') {
      try {
        const response = await fetch(`/api/vip/profiles/${user.id}`);
        if (response.ok) {
          const { profile } = await response.json();
          if (profile) setVipProfile({ ...EMPTY_VIP_PROFILE, ...profile });
        }
      } catch (error) {
        console.error('Error loading VIP details:', error);
        setError('Failed to load VIP details');
      }
    }
  }

  async function exportVips() {
    const params = new URLSearchParams();
    if (exportFilters.consent !== 'any') params.set('consent', exportFilters.consent);
    if (exportFilters.age_range !== 'any') params.set('age_range', exportFilters.age_range);
    if (exportFilters.city.trim()) params.set('city', exportFilters.city.trim());

    // Download in the background so a failure shows an error instead of leaving the page
    try {
      setError(null);
      const response = await fetch(`/api/vip/profiles/export?${params.toString()}`);
      if (!response.ok) {
        setError(response.status === 401 ? 'Your session has expired. Please log in again.' : 'Failed to export VIPs');
        setIsExportDialogOpen(false);
        return;
      }
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'versatalent-vips.csv';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export VIPs');
      setIsExportDialogOpen(false);
    }
  }

  function openPurchaseHistory(user: NFCUser) {
    setSelectedUser(user);
    setIsPurchaseHistoryOpen(true);
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Users ({users.length})</h2>
        <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setIsExportDialogOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export VIPs
        </Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

            {formData.role === 'vip' && (
              <VIPDetailsFields value={vipProfile} onChange={setVipProfile} />
            )}
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

      {/* Export VIPs Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export VIPs</DialogTitle>
            <DialogDescription>
              Download VIP details as a CSV for marketing campaigns. Only contact people through
              channels they consented to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Consented to</label>
              <Select value={exportFilters.consent} onValueChange={(v) => setExportFilters({ ...exportFilters, consent: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Everyone (no consent filter)</SelectItem>
                  <SelectItem value="email">Email marketing</SelectItem>
                  <SelectItem value="sms">SMS marketing</SelectItem>
                  <SelectItem value="post">Postal marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Age range</label>
              <Select value={exportFilters.age_range} onValueChange={(v) => setExportFilters({ ...exportFilters, age_range: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {AGE_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Input
                value={exportFilters.city}
                onChange={(e) => setExportFilters({ ...exportFilters, city: e.target.value })}
                placeholder="Any city"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={exportVips} className="bg-gold hover:bg-gold/90 text-white">
              <Download className="h-4 w-4 mr-2" />
              Download CSV
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
