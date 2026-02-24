"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, MapPin, Clock } from "lucide-react";

interface CheckIn {
  id: string;
  user_id: string;
  timestamp: string;
  source: string;
  user?: {
    name: string;
    email: string;
  };
  event?: {
    name: string;
  };
  metadata: any;
}

export function CheckInsLog() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [filteredCheckins, setFilteredCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    fetchCheckIns();
  }, []);

  useEffect(() => {
    let filtered = checkins;

    if (searchTerm) {
      filtered = filtered.filter(ci =>
        ci.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter(ci => ci.source === sourceFilter);
    }

    setFilteredCheckins(filtered);
  }, [checkins, searchTerm, sourceFilter]);

  async function fetchCheckIns() {
    try {
      setLoading(true);
      const response = await fetch('/api/nfc/checkins');
      const data = await response.json();
      setCheckins(data);
      setFilteredCheckins(data);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Check-ins Log ({filteredCheckins.length})</h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by user name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="artist_profile">Artist Profile</SelectItem>
              <SelectItem value="vip_pass">VIP Pass</SelectItem>
              <SelectItem value="event_checkin">Event Check-in</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading check-ins...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Source</th>
                <th className="text-left py-3 px-4">Event</th>
                <th className="text-left py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheckins.map((checkin) => (
                <tr key={checkin.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {checkin.user ? (
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {checkin.user.name}
                        </div>
                        <div className="text-sm text-gray-500">{checkin.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unknown User</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={`
                        ${checkin.source === 'artist_profile' ? 'bg-blue-100 text-blue-800' : ''}
                        ${checkin.source === 'vip_pass' ? 'bg-gold/20 text-gold' : ''}
                        ${checkin.source === 'event_checkin' ? 'bg-green-100 text-green-800' : ''}
                        ${checkin.source === 'admin' ? 'bg-purple-100 text-purple-800' : ''}
                      `}
                    >
                      {checkin.source.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {checkin.event ? (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {checkin.event.name}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No event</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {new Date(checkin.timestamp).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredCheckins.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No check-ins found
        </div>
      )}
    </div>
  );
}
