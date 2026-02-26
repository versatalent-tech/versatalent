"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Save,
  RefreshCw,
  Settings,
  Coins,
  Calendar,
  ShoppingCart,
  Info,
  Check,
  Trophy,
  Edit3,
} from "lucide-react";
import type { VIPPointRule } from "@/lib/db/types";
interface PointRulesManagerProps {
  className?: string;
}
// Default point rules if none exist
const DEFAULT_RULES: Partial<VIPPointRule>[] = [
  {
    action_type: "consumption",
    points_per_unit: 0.333333,
    unit: "EUR",
    is_active: true,
  },
  {
    action_type: "event_checkin",
    points_per_unit: 10,
    unit: "checkin",
    is_active: true,
  },
  {
    action_type: "tier_bonus",
    points_per_unit: 50,
    unit: "bonus",
    is_active: true,
  },
];
// Helper to convert points_per_unit to "euros per point" display
function pointsPerUnitToEurosPerPoint(pointsPerUnit: number): number {
  if (pointsPerUnit <= 0) return 0;
  return Math.round((1 / pointsPerUnit) * 100) / 100;
}
// Helper to convert "euros per point" back to points_per_unit
function eurosPerPointToPointsPerUnit(eurosPerPoint: number): number {
  if (eurosPerPoint <= 0) return 0;
  return 1 / eurosPerPoint;
}
export function PointRulesManager({ className }: PointRulesManagerProps) {
  const [rules, setRules] = useState<VIPPointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Form state for easier editing
  const [eurosPerPoint, setEurosPerPoint] = useState(3); // Default: 1 point per 3 euros
  const [checkinPoints, setCheckinPoints] = useState(10);
  const [tierBonusPoints, setTierBonusPoints] = useState(50);
  const [consumptionActive, setConsumptionActive] = useState(true);
  const [checkinActive, setCheckinActive] = useState(true);
  // Tier threshold state
  const [goldThreshold, setGoldThreshold] = useState(500);
  const [blackThreshold, setBlackThreshold] = useState(1750);
  useEffect(() => {
    fetchRules();
  }, []);
  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/vip/point-rules");
      if (response.ok) {
        const data: VIPPointRule[] = await response.json();
        setRules(data);
        // Update form values from fetched rules
        const consumptionRule = data.find((r) => r.action_type === "consumption");
        const checkinRule = data.find((r) => r.action_type === "event_checkin");
        const bonusRule = data.find((r) => r.action_type === "tier_bonus");
        const goldThresholdRule = data.find((r) => r.action_type === "tier_threshold_gold");
        const blackThresholdRule = data.find((r) => r.action_type === "tier_threshold_black");
        if (consumptionRule) {
          setEurosPerPoint(pointsPerUnitToEurosPerPoint(consumptionRule.points_per_unit));
          setConsumptionActive(consumptionRule.is_active);
        }
        if (checkinRule) {
          setCheckinPoints(Math.round(checkinRule.points_per_unit));
          setCheckinActive(checkinRule.is_active);
        }
        if (bonusRule) {
          setTierBonusPoints(Math.round(bonusRule.points_per_unit));
        }
        if (goldThresholdRule) {
          setGoldThreshold(Math.round(goldThresholdRule.points_per_unit));
        }
        if (blackThresholdRule) {
          setBlackThreshold(Math.round(blackThresholdRule.points_per_unit));
        }
      } else {
        console.log("No rules found, will create defaults on save");
      }
    } catch (err) {
      console.error("Error fetching point rules:", err);
      setError("Failed to load point rules");
    } finally {
      setLoading(false);
    }
  };
  const saveRule = async (actionType: string, pointsPerUnit: number, unit: string, isActive: boolean) => {
    const response = await fetch("/api/vip/point-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_type: actionType,
        points_per_unit: pointsPerUnit,
        unit,
        is_active: isActive,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to save rule: ${actionType}`);
    }
    return response.json();
  };
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      // Validate tier thresholds
      if (goldThreshold <= 0) {
        setError("Gold threshold must be greater than 0");
        setSaving(false);
        return;
      }
      if (blackThreshold <= goldThreshold) {
        setError("Black threshold must be greater than Gold threshold");
        setSaving(false);
        return;
      }
      // Save consumption rule
      await saveRule(
        "consumption",
        eurosPerPointToPointsPerUnit(eurosPerPoint),
        "EUR",
        consumptionActive
      );
      // Save event check-in rule
      await saveRule("event_checkin", checkinPoints, "checkin", checkinActive);
      // Save tier bonus rule
      await saveRule("tier_bonus", tierBonusPoints, "bonus", true);
      // Save tier threshold rules
      await saveRule("tier_threshold_gold", goldThreshold, "points", true);
      await saveRule("tier_threshold_black", blackThreshold, "points", true);
      setSuccess("Point rules and tier thresholds saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
      // Refresh rules
      await fetchRules();
    } catch (err: any) {
      console.error("Error saving point rules:", err);
      setError(err.message || "Failed to save point rules");
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
        <p className="text-gray-600">Loading point rules...</p>
      </div>
    );
  }
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Point Rules Configuration</h2>
          <p className="text-gray-600">Configure how VIP points are earned and tier thresholds</p>
        </div>
        <Button
          onClick={handleSaveAll}
          className="bg-gold hover:bg-gold/90 text-white"
          disabled={saving}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Rules
            </>
          )}
        </Button>
      </div>
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">How Points Work</p>
          <p>
            Points are earned through purchases and event check-ins. When members reach tier thresholds,
            they automatically upgrade to the next VIP level. You can customize both point earning rates
            and tier thresholds below.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consumption Points Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <CardTitle className="text-lg">Purchase Points</CardTitle>
                  <CardDescription>Points earned per purchase</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Active</span>
                <Switch
                  checked={consumptionActive}
                  onCheckedChange={setConsumptionActive}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Euros per Point
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={eurosPerPoint}
                    onChange={(e) => setEurosPerPoint(parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-gray-600">EUR = 1 point</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Current: <strong>1 point per {eurosPerPoint} euros</strong> spent
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Example Calculations:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>10 EUR purchase = <strong>{Math.floor(10 / eurosPerPoint)} points</strong></p>
                  <p>25 EUR purchase = <strong>{Math.floor(25 / eurosPerPoint)} points</strong></p>
                  <p>100 EUR purchase = <strong>{Math.floor(100 / eurosPerPoint)} points</strong></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Event Check-in Points Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Event Check-in Points</CardTitle>
                  <CardDescription>Points per event attendance</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Active</span>
                <Switch
                  checked={checkinActive}
                  onCheckedChange={setCheckinActive}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Points per Check-in
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={checkinPoints}
                    onChange={(e) => setCheckinPoints(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-gray-600">points</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Members earn <strong>{checkinPoints} points</strong> for each event check-in
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Example Scenarios:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>3 events/month = <strong>{checkinPoints * 3} points</strong></p>
                  <p>10 events/quarter = <strong>{checkinPoints * 10} points</strong></p>
                  <p>50 events/year = <strong>{checkinPoints * 50} points</strong></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Tier Upgrade Bonus Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Tier Upgrade Bonus</CardTitle>
                <CardDescription>Bonus points when upgrading tiers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Bonus Points
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={tierBonusPoints}
                    onChange={(e) => setTierBonusPoints(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-gray-600">points per tier upgrade</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Tier Thresholds Card - Now Editable */}
        <Card className="border-2 border-gold/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-gray-100 to-yellow-100 rounded-lg">
                <Edit3 className="h-5 w-5 text-gold" />
              </div>
              <div>
                <CardTitle className="text-lg">Tier Thresholds</CardTitle>
                <CardDescription>Configure points needed for each tier</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Silver Tier - Always 0 */}
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-400">Silver</Badge>
                  <span className="text-sm text-gray-600">Starting tier</span>
                </div>
                <span className="font-bold text-gray-500">0 points</span>
              </div>
              {/* Gold Tier - Editable */}
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gold">Gold</Badge>
                    <span className="text-sm text-gray-600">Mid tier</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={goldThreshold}
                    onChange={(e) => setGoldThreshold(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-gray-600">points required</span>
                </div>
              </div>
              {/* Black Tier - Editable */}
              <div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-black text-white border border-gray-600">Black</Badge>
                    <span className="text-sm text-gray-300">Top tier</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={blackThreshold}
                    onChange={(e) => setBlackThreshold(parseInt(e.target.value) || 0)}
                    className="w-32 bg-gray-800 border-gray-600 text-white"
                  />
                  <span className="text-gray-300">points required</span>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  <strong>Tip:</strong> Members automatically upgrade when they reach the threshold.
                  Changes take effect immediately after saving.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Current Active Rules Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Current Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Purchase Points</p>
              <p className="text-2xl font-bold text-gold">
                1 pt / {eurosPerPoint} EUR
              </p>
              <Badge variant={consumptionActive ? "default" : "secondary"} className="mt-2">
                {consumptionActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Event Check-in</p>
              <p className="text-2xl font-bold text-purple-600">
                {checkinPoints} pts
              </p>
              <Badge variant={checkinActive ? "default" : "secondary"} className="mt-2">
                {checkinActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Tier Bonus</p>
              <p className="text-2xl font-bold text-amber-600">
                {tierBonusPoints} pts
              </p>
              <Badge variant="default" className="mt-2">Active</Badge>
            </div>
          </div>
          {/* Tier Thresholds Summary */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Tier Progression</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Badge className="bg-gray-400">Silver</Badge>
                <span className="text-sm text-gray-500">0 pts</span>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex items-center gap-1">
                <Badge className="bg-gold">Gold</Badge>
                <span className="text-sm text-gray-500">{goldThreshold} pts</span>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex items-center gap-1">
                <Badge className="bg-black text-white">Black</Badge>
                <span className="text-sm text-gray-500">{blackThreshold} pts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}