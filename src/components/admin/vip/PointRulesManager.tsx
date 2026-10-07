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
  Percent,
} from "lucide-react";
import type { VIPPointRule, VIPTier } from "@/lib/db/types";
import { DEFAULT_TIER_SETTINGS } from "@/lib/vip-tier-rules";
import { POS_CURRENCY } from "@/lib/utils/formatting";
interface PointRulesManagerProps {
  className?: string;
}
// Default point rules if none exist
const DEFAULT_RULES: Partial<VIPPointRule>[] = [
  {
    action_type: "consumption",
    points_per_unit: 1 / 3,
    unit: POS_CURRENCY,
    is_active: true,
  },
  {
    action_type: "event_checkin",
    points_per_unit: 10,
    unit: "checkin",
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
  // Member discounts (percent) and points multipliers per tier
  const [discounts, setDiscounts] = useState<Record<VIPTier, number>>(DEFAULT_TIER_SETTINGS.discounts);
  const [goldMultiplier, setGoldMultiplier] = useState(DEFAULT_TIER_SETTINGS.multipliers.gold);
  const [blackMultiplier, setBlackMultiplier] = useState(DEFAULT_TIER_SETTINGS.multipliers.black);
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
        const ruleValue = (actionType: string) => data.find((r) => r.action_type === actionType)?.points_per_unit;
        setDiscounts({
          silver: ruleValue("tier_discount_silver") ?? DEFAULT_TIER_SETTINGS.discounts.silver,
          gold: ruleValue("tier_discount_gold") ?? DEFAULT_TIER_SETTINGS.discounts.gold,
          black: ruleValue("tier_discount_black") ?? DEFAULT_TIER_SETTINGS.discounts.black,
        });
        setGoldMultiplier(ruleValue("tier_multiplier_gold") ?? DEFAULT_TIER_SETTINGS.multipliers.gold);
        setBlackMultiplier(ruleValue("tier_multiplier_black") ?? DEFAULT_TIER_SETTINGS.multipliers.black);
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
      if (Object.values(discounts).some((d) => !(d >= 0 && d <= 100))) {
        setError("Member discounts must be between 0% and 100%");
        setSaving(false);
        return;
      }
      if (!(goldMultiplier >= 1) || !(blackMultiplier >= 1)) {
        setError("Points multipliers must be at least 1");
        setSaving(false);
        return;
      }
      // Save consumption rule
      await saveRule(
        "consumption",
        eurosPerPointToPointsPerUnit(eurosPerPoint),
        POS_CURRENCY,
        consumptionActive
      );
      // Save event check-in rule
      await saveRule("event_checkin", checkinPoints, "checkin", checkinActive);
      // Save member discounts and points multipliers
      for (const tier of ["silver", "gold", "black"] as VIPTier[]) {
        await saveRule(`tier_discount_${tier}`, discounts[tier], "percent", true);
      }
      await saveRule("tier_multiplier_gold", goldMultiplier, "multiplier", true);
      await saveRule("tier_multiplier_black", blackMultiplier, "multiplier", true);
      // Save tier threshold rules
      await saveRule("tier_threshold_gold", goldThreshold, "points", true);
      await saveRule("tier_threshold_black", blackThreshold, "points", true);
      setSuccess("Point rules, tier thresholds, discounts and multipliers saved successfully!");
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
            Points are earned through purchases and event check-ins, multiplied by the member&apos;s tier rate.
            Tiers are earned each membership year (from the day the member joined): reaching a threshold
            moves a member up straight away, and the tier is kept for the rest of that year and all of the
            next. A member who doesn&apos;t requalify drops one tier at their anniversary.
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
                  Pounds per Point
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
                  <span className="text-gray-600">£ = 1 point</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Current: <strong>1 point per £{eurosPerPoint}</strong> spent
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Example Calculations:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>£10 purchase = <strong>{Math.floor(10 / eurosPerPoint)} points</strong></p>
                  <p>£25 purchase = <strong>{Math.floor(25 / eurosPerPoint)} points</strong></p>
                  <p>£100 purchase = <strong>{Math.floor(100 / eurosPerPoint)} points</strong></p>
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
        {/* Member Discounts Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Percent className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <CardTitle className="text-lg">Member Discounts</CardTitle>
                <CardDescription>Percent off till items, by tier</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["silver", "gold", "black"] as VIPTier[]).map((tier) => (
                <div key={tier} className="flex items-center justify-between gap-3">
                  <Badge className={tier === "black" ? "bg-black text-white" : tier === "gold" ? "bg-gold" : "bg-gray-400"}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={discounts[tier]}
                      onChange={(e) => setDiscounts({ ...discounts, [tier]: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <span className="text-gray-600">% off</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Applied at the till when a member&apos;s card is linked. Products marked &quot;Excluded from member
                discounts&quot; in POS admin are always full price.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Points Multipliers Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Points Multipliers</CardTitle>
                <CardDescription>Extra points for higher tiers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Badge className="bg-gray-400">Silver</Badge>
                <span className="text-gray-600">1x (standard)</span>
              </div>
              {([
                ["Gold", goldMultiplier, setGoldMultiplier, "bg-gold"],
                ["Black", blackMultiplier, setBlackMultiplier, "bg-black text-white"],
              ] as const).map(([label, value, setValue, badge]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <Badge className={badge}>{label}</Badge>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={value}
                      onChange={(e) => setValue(parseFloat(e.target.value) || 1)}
                      className="w-24"
                    />
                    <span className="text-gray-600">x points</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Applies to check-ins and purchases (not manual adjustments). Example: a £30 purchase earns a Gold
                member {Math.floor(Math.floor(30 / eurosPerPoint) * goldMultiplier)} points.
              </p>
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
                <CardDescription>Points needed within a membership year</CardDescription>
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
                  <strong>Tip:</strong> Points count towards a tier for the membership year they were earned
                  in. Changes take effect within a minute of saving.
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
                1 pt / £{eurosPerPoint}
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
              <p className="text-sm text-gray-600 mb-1">Member Discounts</p>
              <p className="text-2xl font-bold text-green-700">
                {discounts.silver}% / {discounts.gold}% / {discounts.black}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Silver / Gold / Black</p>
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