"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ClubRecord {
  years: string;
  team: string;
  appearances: number;
  goals: number;
  assists: number;
}

export function PreviousClubsTable({ records }: { records: ClubRecord[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg">Previous Clubs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 pr-4">Years</th>
                <th className="py-2 pr-4">Team</th>
                <th className="py-2 pr-4 text-right">Appearances</th>
                <th className="py-2 pr-0 text-right">Goals</th>
                <th className="py-2 pr-0 text-right">Assists</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap">{r.years}</td>
                  <td className="py-3 pr-4">{r.team}</td>
                  <td className="py-3 pr-4 text-right font-medium">{r.appearances}</td>
                  <td className="py-3 pr-0 text-right font-medium">{r.goals}</td>
                  <td className="py-3 pr-0 text-right font-medium">{r.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
