"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { FoundingPassCard } from "@/components/membership/FoundingPassCard";
import { RewardsPassCard } from "@/components/loyalty/RewardsPassCard";
import { ReferralPassCard } from "@/components/loyalty/ReferralPassCard";
import { POINT_SOURCE_LABELS } from "@/lib/loyalty/types";
import type { TierProgress } from "@/lib/vip-tier-rules";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  Star,
  Calendar,
  Award,
  Loader2,
  TrendingUp,
  Trophy,
  ShoppingCart,
  History,
  ArrowUp,
  ArrowDown,
  Nfc
} from "lucide-react";

interface VIPUser {
  id: string;
  name: string;
  email?: string; // only returned to logged-in staff/admins
  role: string;
  avatar_url?: string;
  created_at: string;
}

interface VIPMembership {
  id: string;
  user_id: string;
  tier: 'silver' | 'gold' | 'black';
  points_balance: number;
  lifetime_points: number;
  status: string;
  created_at: string;
  progress?: TierProgress;
}

interface PointsLog {
  id: string;
  source: string;
  delta_points: number;
  balance_after: number;
  metadata: any;
  created_at: string;
}

interface Consumption {
  id: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
}

interface CheckIn {
  id: string;
  source: string;
  timestamp: string;
  event?: {
    name: string;
  };
}

interface TierBenefit {
  id: string;
  tier_name: string;
  title: string;
  description?: string;
  is_active: boolean;
}

export default function VIPPassPage() {
  const params = useParams();
  const [vipUser, setVipUser] = useState<VIPUser | null>(null);
  const [membership, setMembership] = useState<VIPMembership | null>(null);
  const [pointsLog, setPointsLog] = useState<PointsLog[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [benefits, setBenefits] = useState<TierBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch user data
        const userResponse = await fetch(`/api/nfc/users/${params.id}`);
        if (!userResponse.ok) {
          setError('VIP pass not found');
          return;
        }
        const userData = await userResponse.json();
        setVipUser(userData);

        // Fetch VIP membership
        const membershipResponse = await fetch(`/api/vip/memberships/${params.id}`);
        let membershipData = null;
        if (membershipResponse.ok) {
          membershipData = await membershipResponse.json();
          setMembership(membershipData);
        }

        // Fetch points log
        const pointsResponse = await fetch(`/api/vip/points-log?user_id=${params.id}&limit=50`);
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPointsLog(pointsData);
        }

        // Fetch consumptions (would need to create this endpoint)
        // For now, we'll leave it empty

        // Fetch check-ins
        const checkinsResponse = await fetch(`/api/nfc/checkins?user_id=${params.id}`);
        if (checkinsResponse.ok) {
          const checkinsData = await checkinsResponse.json();
          setCheckins(checkinsData.slice(0, 10));
        }

        // Fetch tier benefits if membership exists
        if (membershipData) {
          const benefitsResponse = await fetch(`/api/admin/tier-benefits?tier=${membershipData.tier}&active_only=true`);
          if (benefitsResponse.ok) {
            const benefitsData = await benefitsResponse.json();
            setBenefits(benefitsData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load VIP data');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  function getTierColor(tier: string) {
    switch (tier) {
      case 'black': return 'from-gray-900 to-black';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-300 to-gray-400';
      default: return 'from-gray-300 to-gray-400';
    }
  }

  function getTierBadge(tier: string) {
    switch (tier) {
      case 'black': return 'bg-black text-white';
      case 'gold': return 'bg-gold text-white';
      case 'silver': return 'bg-gray-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  }

  function tierName(tier: string) {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }

  function formatDay(date: string) {
    return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gold via-amber-500 to-gold">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error || !vipUser) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gold via-amber-500 to-gold">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">{error || 'VIP Pass Not Found'}</h1>
            <Link href="/" className="text-white underline">Go to Homepage</Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const tierColor = membership ? getTierColor(membership.tier) : 'from-gray-300 to-gray-400';
  const tierBadge = membership ? getTierBadge(membership.tier) : 'bg-gray-400 text-white';
  const progress = membership?.progress;
  const pointsToNext = progress?.points_to_next ?? null;
  const nextTier = progress?.next_tier ? tierName(progress.next_tier) : null;

  return (
    <MainLayout>
      <section className={`min-h-screen bg-gradient-to-br ${tierColor} py-16`}>
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto">
            {/* VIP Card Header */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-gray-900 to-black text-white p-8">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`${tierBadge} border-none text-lg px-4 py-2`}>
                    <Trophy className="h-5 w-5 mr-2" />
                    {membership?.tier.toUpperCase() || 'SILVER'} VIP
                  </Badge>
                  <Award className="h-16 w-16 text-gold" />
                </div>
                <h1 className="text-3xl font-bold mb-2">{vipUser.name}</h1>
                {vipUser.email && <p className="text-gray-300">{vipUser.email}</p>}
              </div>

              {/* Points Summary */}
              {membership && (
                <div className="p-8 bg-gradient-to-r from-gold/10 to-amber-100">
                  {progress && (
                    <div className="mb-6 text-center">
                      <p className="text-lg font-semibold text-gray-900">
                        {tierName(progress.tier)} member until {formatDay(progress.tier_secured_until)}
                      </p>
                      {progress.points_to_keep > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          Earn {progress.points_to_keep} more points by {formatDay(progress.year_ends)} to keep {tierName(progress.tier)} for another year
                        </p>
                      )}
                      {(progress.discount_percent > 0 || progress.points_multiplier > 1) && (
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {progress.discount_percent > 0 && (
                            <Badge className="bg-black text-white">{progress.discount_percent}% off purchases</Badge>
                          )}
                          {progress.points_multiplier > 1 && (
                            <Badge className="bg-black text-white">{progress.points_multiplier}x points</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gold mb-1">
                        {membership.points_balance}
                      </div>
                      <div className="text-sm text-gray-600">Current Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-1">
                        {progress?.status_points ?? 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Points this year{progress ? ` (to ${formatDay(progress.year_ends)})` : ''}
                      </div>
                    </div>
                    <div className="text-center">
                      {pointsToNext !== null && nextTier ? (
                        <>
                          <div className="text-4xl font-bold text-blue-600 mb-1">
                            {pointsToNext}
                          </div>
                          <div className="text-sm text-gray-600">
                            Points to {nextTier} this year
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            <Star className="h-8 w-8 mx-auto" />
                          </div>
                          <div className="text-sm text-gray-600">
                            Top tier
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress to next tier this membership year */}
                  {progress && pointsToNext !== null && nextTier && (
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>{tierName(progress.tier)}</span>
                        <span>{nextTier}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-gold to-yellow-500 h-3 rounded-full transition-all"
                          style={{
                            width: `${progress.status_points + pointsToNext > 0 ? (progress.status_points / (progress.status_points + pointsToNext)) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="mt-4 text-center text-xs text-gray-500">
                    Lifetime points: {membership.lifetime_points}
                  </p>
                </div>
              )}

              {/* Check-in info: check-ins happen by tapping the card */}
              <div className="p-8 border-t">
                <div className="flex items-center gap-3 rounded-lg bg-gold/10 p-4 text-gray-700">
                  <Nfc className="h-6 w-6 shrink-0 text-gold" />
                  <p>Tap your VersaTalent card at the door of an event to check in and earn your points.</p>
                </div>
              </div>
            </div>

            <FoundingPassCard memberId={vipUser.id} />
            <RewardsPassCard memberId={vipUser.id} />
            <ReferralPassCard memberId={vipUser.id} />

            {/* Activity Tabs */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <Tabs defaultValue="benefits" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="benefits">
                    <Award className="h-4 w-4 mr-2" />
                    Benefits
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <History className="h-4 w-4 mr-2" />
                    Points History
                  </TabsTrigger>
                  <TabsTrigger value="checkins">
                    <Calendar className="h-4 w-4 mr-2" />
                    Check-ins
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="benefits">
                  <div className="space-y-4">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-2">
                        {membership?.tier && (
                          <span className={`capitalize`}>
                            {membership.tier} Tier Benefits
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600">
                        Enjoy these exclusive perks as a valued VIP member
                      </p>
                    </div>

                    {benefits.length > 0 ? (
                      <div className="grid gap-4">
                        {benefits.map((benefit) => (
                          <div key={benefit.id} className="flex items-start gap-4 p-4 bg-gradient-to-r from-gold/5 to-amber-50 rounded-lg border border-gold/20">
                            <div className="bg-gold/20 p-2 rounded-full flex-shrink-0">
                              <Check className="h-5 w-5 text-gold" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">
                                {benefit.title}
                              </h4>
                              {benefit.description && (
                                <p className="text-sm text-gray-600">
                                  {benefit.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No benefits configured for this tier yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <div className="space-y-3">
                    {pointsLog.length > 0 ? (
                      pointsLog.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {log.delta_points > 0 ? (
                              <div className="bg-green-100 p-2 rounded-full">
                                <ArrowUp className="h-5 w-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="bg-red-100 p-2 rounded-full">
                                <ArrowDown className="h-5 w-5 text-red-600" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold">
                                {(POINT_SOURCE_LABELS[log.source] ?? log.source.replace('_', ' ')).toUpperCase()}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(log.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${log.delta_points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {log.delta_points > 0 ? '+' : ''}{log.delta_points}
                            </div>
                            <div className="text-sm text-gray-500">
                              Balance: {log.balance_after}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No points history yet</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="checkins">
                  <div className="space-y-3">
                    {checkins.length > 0 ? (
                      checkins.map((checkin) => (
                        <div key={checkin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Check className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold">
                                {checkin.event?.name || 'Event Check-in'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(checkin.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-green-500 text-green-700">
                            +10 pts
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No check-ins yet</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
