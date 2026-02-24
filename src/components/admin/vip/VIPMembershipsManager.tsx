"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trophy, Star, TrendingUp, Users } from "lucide-react";

interface VIPMember {
  id: string;
  user_id: string;
  tier: 'silver' | 'gold' | 'black';
  points_balance: number;
  lifetime_points: number;
  status: string;
  user: {
    name: string;
    email: string;
  };
}

export function VIPMembershipsManager() {
  const [members, setMembers] = useState<VIPMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<VIPMember | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      setLoading(true);
      const response = await fetch('/api/vip/memberships');
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching VIP members:', error);
      setError('Failed to load VIP members');
    } finally {
      setLoading(false);
    }
  }

  async function handlePointsAdjustment() {
    if (!selectedMember) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/vip/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedMember.user_id,
          delta_points: adjustPoints,
          reason: adjustReason
        })
      });

      if (response.ok) {
        setSuccess(`Successfully adjusted points by ${adjustPoints}`);
        setIsAdjustDialogOpen(false);
        setSelectedMember(null);
        setAdjustPoints(0);
        setAdjustReason('');
        await fetchMembers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to adjust points');
      }
    } catch (error) {
      console.error('Points adjustment error:', error);
      setError('Failed to adjust points');
    } finally {
      setSaving(false);
    }
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

  function getTierIcon(tier: string) {
    switch (tier) {
      case 'black':
        return <Trophy className="h-4 w-4" />;
      case 'gold':
        return <Star className="h-4 w-4" />;
      case 'silver':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  }

  // Calculate stats
  const stats = {
    total: members.length,
    black: members.filter(m => m.tier === 'black').length,
    gold: members.filter(m => m.tier === 'gold').length,
    silver: members.filter(m => m.tier === 'silver').length,
    totalPoints: members.reduce((sum, m) => sum + m.lifetime_points, 0)
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">VIP Memberships ({members.length})</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Members</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-black/5 rounded-lg p-4">
            <div className="text-sm text-gray-600">Black Tier</div>
            <div className="text-2xl font-bold text-black">{stats.black}</div>
          </div>
          <div className="bg-gold/10 rounded-lg p-4">
            <div className="text-sm text-gray-600">Gold Tier</div>
            <div className="text-2xl font-bold text-gold">{stats.gold}</div>
          </div>
          <div className="bg-gray-200/50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Silver Tier</div>
            <div className="text-2xl font-bold text-gray-600">{stats.silver}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Points</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalPoints.toLocaleString()}
            </div>
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
        <div className="text-center py-8">Loading VIP members...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Member</th>
                <th className="text-left py-3 px-4">Tier</th>
                <th className="text-right py-3 px-4">Points</th>
                <th className="text-right py-3 px-4">Lifetime</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={`${getTierBadge(member.tier)} flex items-center gap-1 w-fit`}>
                      {getTierIcon(member.tier)}
                      {member.tier.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-semibold text-gold">
                      {member.points_balance.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {member.lifetime_points.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        member.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsAdjustDialogOpen(true);
                        }}
                      >
                        Adjust Points
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Points Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
            <DialogDescription>
              Manually adjust points for {selectedMember?.user.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedMember && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="text-sm text-gray-600">Current Points</div>
                <div className="text-2xl font-bold text-gold">
                  {selectedMember.points_balance.toLocaleString()}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Points Adjustment (use negative for deduction)
              </label>
              <Input
                type="number"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                placeholder="e.g., 100 or -50"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Reason *</label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Compensation, Bonus, Correction"
              />
            </div>

            {adjustPoints !== 0 && selectedMember && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-700">
                  New Balance:{' '}
                  <span className="font-bold text-blue-700">
                    {(selectedMember.points_balance + adjustPoints).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdjustDialogOpen(false);
                setSelectedMember(null);
                setAdjustPoints(0);
                setAdjustReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePointsAdjustment}
              disabled={saving || adjustPoints === 0 || !adjustReason}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {saving ? 'Adjusting...' : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
