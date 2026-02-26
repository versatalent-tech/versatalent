"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Target, Users, ArrowRight, X, Scale, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Talent, SportsDetails } from "@/lib/db/types";

interface ComparisonStat {
  label: string;
  player1Value: number | string | undefined;
  player2Value: number | string | undefined;
  winner: 1 | 2 | 0; // 0 = tie
  icon: React.ReactNode;
}

function StatBar({ label, value1, value2, max }: { label: string; value1: number; value2: number; max: number }) {
  const pct1 = max > 0 ? (value1 / max) * 100 : 0;
  const pct2 = max > 0 ? (value2 / max) * 100 : 0;
  const winner = value1 > value2 ? 1 : value2 > value1 ? 2 : 0;

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className={`font-semibold ${winner === 1 ? 'text-green-600' : 'text-gray-600'}`}>{value1}</span>
        <span className="text-gray-500">{label}</span>
        <span className={`font-semibold ${winner === 2 ? 'text-green-600' : 'text-gray-600'}`}>{value2}</span>
      </div>
      <div className="flex gap-1">
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden flex justify-end">
          <div
            className={`h-full ${winner === 1 ? 'bg-green-500' : 'bg-blue-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct1}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${winner === 2 ? 'bg-green-500' : 'bg-orange-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct2}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  talent,
  onRemove,
  color
}: {
  talent: Talent;
  onRemove: () => void;
  color: string;
}) {
  const details = talent.industry_details as SportsDetails | undefined;
  const imageSrc = (talent as any).imageSrc || talent.image_src;

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border-2 ${color} overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="relative h-48 bg-gray-100">
        {imageSrc && (
          <Image
            src={imageSrc}
            alt={talent.name}
            fill
            className="object-cover"
          />
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg">{talent.name}</h3>
        <p className="text-gray-600 text-sm">{talent.profession}</p>
        {details?.current_team && (
          <Badge variant="outline" className="mt-2">{details.current_team}</Badge>
        )}
        {details?.positions_played && details.positions_played.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {details.positions_played.map((pos, idx) => (
              <Badge key={idx} className="text-xs bg-gray-100 text-gray-700">{pos}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [sportsTalents, setSportsTalents] = useState<Talent[]>([]);
  const [player1, setPlayer1] = useState<Talent | null>(null);
  const [player2, setPlayer2] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSportsTalents = async () => {
      try {
        const response = await fetch("/api/talents?industry=sports");
        if (response.ok) {
          const data = await response.json();
          setSportsTalents(data);
        }
      } catch (error) {
        console.error("Error fetching sports talents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSportsTalents();
  }, []);

  const getStats = (): ComparisonStat[] => {
    if (!player1 || !player2) return [];

    const p1Details = player1.industry_details as SportsDetails | undefined;
    const p2Details = player2.industry_details as SportsDetails | undefined;

    const stats: ComparisonStat[] = [];

    // Goals
    const p1Goals = p1Details?.goals_scored ?? 0;
    const p2Goals = p2Details?.goals_scored ?? 0;
    stats.push({
      label: "Goals",
      player1Value: p1Goals,
      player2Value: p2Goals,
      winner: p1Goals > p2Goals ? 1 : p2Goals > p1Goals ? 2 : 0,
      icon: <Target className="h-4 w-4" />,
    });

    // Assists
    const p1Assists = p1Details?.assists ?? 0;
    const p2Assists = p2Details?.assists ?? 0;
    stats.push({
      label: "Assists",
      player1Value: p1Assists,
      player2Value: p2Assists,
      winner: p1Assists > p2Assists ? 1 : p2Assists > p1Assists ? 2 : 0,
      icon: <Users className="h-4 w-4" />,
    });

    // Positions (count)
    const p1Positions = p1Details?.positions_played?.length ?? 0;
    const p2Positions = p2Details?.positions_played?.length ?? 0;
    stats.push({
      label: "Versatility (Positions)",
      player1Value: p1Positions,
      player2Value: p2Positions,
      winner: p1Positions > p2Positions ? 1 : p2Positions > p1Positions ? 2 : 0,
      icon: <Scale className="h-4 w-4" />,
    });

    // Previous Teams (experience)
    const p1Teams = p1Details?.teams_played?.length ?? 0;
    const p2Teams = p2Details?.teams_played?.length ?? 0;
    stats.push({
      label: "Experience (Teams)",
      player1Value: p1Teams,
      player2Value: p2Teams,
      winner: p1Teams > p2Teams ? 1 : p2Teams > p1Teams ? 2 : 0,
      icon: <Trophy className="h-4 w-4" />,
    });

    return stats;
  };

  const stats = getStats();
  const p1Wins = stats.filter(s => s.winner === 1).length;
  const p2Wins = stats.filter(s => s.winner === 2).length;

  const availableForPlayer1 = sportsTalents.filter(t => t.id !== player2?.id);
  const availableForPlayer2 = sportsTalents.filter(t => t.id !== player1?.id);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 py-12 md:py-20">
        <div className="container px-4 mx-auto">
          <div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="bg-green-500/20 text-green-300 mb-4">
              Sports Comparison Tool
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Compare <span className="text-green-400">Athletes</span>
            </h1>
            <p className="text-green-200 text-lg max-w-2xl mx-auto">
              Compare stats, experience, and performance of our sports talents side by side
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="container px-4 mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading sports talents...</p>
            </div>
          ) : sportsTalents.length < 2 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Need at least 2 sports talents to compare
              </p>
              <Link href="/talents">
                <Button>View All Talents</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Player Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Player 1 Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    Player 1
                  </h3>
                  {player1 ? (
                    <PlayerCard
                      talent={player1}
                      onRemove={() => setPlayer1(null)}
                      color="border-blue-500"
                    />
                  ) : (
                    <Select onValueChange={(value) => {
                      const talent = sportsTalents.find(t => t.id === value);
                      if (talent) setPlayer1(talent);
                    }}>
                      <SelectTrigger className="w-full h-48 border-2 border-dashed border-gray-300 bg-white">
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <ChevronDown className="h-8 w-8" />
                          <span>Select Player 1</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableForPlayer1.map((talent) => (
                          <SelectItem key={talent.id} value={talent.id}>
                            {talent.name} - {talent.profession}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Player 2 Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500" />
                    Player 2
                  </h3>
                  {player2 ? (
                    <PlayerCard
                      talent={player2}
                      onRemove={() => setPlayer2(null)}
                      color="border-orange-500"
                    />
                  ) : (
                    <Select onValueChange={(value) => {
                      const talent = sportsTalents.find(t => t.id === value);
                      if (talent) setPlayer2(talent);
                    }}>
                      <SelectTrigger className="w-full h-48 border-2 border-dashed border-gray-300 bg-white">
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <ChevronDown className="h-8 w-8" />
                          <span>Select Player 2</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableForPlayer2.map((talent) => (
                          <SelectItem key={talent.id} value={talent.id}>
                            {talent.name} - {talent.profession}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Comparison Results */}
              
                {player1 && player2 && (
                  <div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white rounded-xl shadow-lg p-6 md:p-8"
                  >
                    {/* Header with Score */}
                    <div className="flex items-center justify-center gap-8 mb-8">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600">{p1Wins}</div>
                        <div className="text-sm text-gray-500">{player1.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-orange-600">{p2Wins}</div>
                        <div className="text-sm text-gray-500">{player2.name}</div>
                      </div>
                    </div>

                    {/* Stats Comparison */}
                    <div className="space-y-6">
                      {stats.map((stat, idx) => {
                        const max = Math.max(
                          typeof stat.player1Value === 'number' ? stat.player1Value : 0,
                          typeof stat.player2Value === 'number' ? stat.player2Value : 0
                        );
                        return (
                          <StatBar
                            key={idx}
                            label={stat.label}
                            value1={typeof stat.player1Value === 'number' ? stat.player1Value : 0}
                            value2={typeof stat.player2Value === 'number' ? stat.player2Value : 0}
                            max={max || 1}
                          />
                        );
                      })}
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-8">
                      {/* Player 1 Details */}
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-600">{player1.name}</h4>
                        {(player1.industry_details as SportsDetails)?.league_played && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">League:</span>{" "}
                            {(player1.industry_details as SportsDetails).league_played}
                          </p>
                        )}
                        {(player1.industry_details as SportsDetails)?.sport_type && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Sport:</span>{" "}
                            {(player1.industry_details as SportsDetails).sport_type}
                          </p>
                        )}
                        <Link href={`/talents/${player1.id}`}>
                          <Button variant="outline" size="sm" className="mt-3">
                            View Profile <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>

                      {/* Player 2 Details */}
                      <div>
                        <h4 className="font-semibold mb-3 text-orange-600">{player2.name}</h4>
                        {(player2.industry_details as SportsDetails)?.league_played && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">League:</span>{" "}
                            {(player2.industry_details as SportsDetails).league_played}
                          </p>
                        )}
                        {(player2.industry_details as SportsDetails)?.sport_type && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Sport:</span>{" "}
                            {(player2.industry_details as SportsDetails).sport_type}
                          </p>
                        )}
                        <Link href={`/talents/${player2.id}`}>
                          <Button variant="outline" size="sm" className="mt-3">
                            View Profile <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              

              {/* CTA */}
              {!player1 || !player2 ? (
                <div className="text-center mt-8">
                  <p className="text-gray-600">
                    Select two players above to compare their stats
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
