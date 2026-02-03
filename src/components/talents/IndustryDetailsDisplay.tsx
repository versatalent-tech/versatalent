"use client";

import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Ruler,
  Palette,
  Trophy,
  Music,
  Film,
  ChefHat,
  MapPin,
  Users,
  Award,
  Target,
  Shirt,
  Eye,
  Scissors,
  Play,
  Disc,
  Building,
  GraduationCap,
  Star,
  Tv,
  UtensilsCrossed,
} from "lucide-react";
import type {
  ModelingDetails,
  SportsDetails,
  MusicDetails,
  ActingDetails,
  CulinaryDetails,
  IndustryDetails,
  Industry,
} from "@/lib/db/types";

interface IndustryDetailsDisplayProps {
  industry: Industry;
  details?: IndustryDetails;
}

// Check if details object has any meaningful content
function hasDetails(details: IndustryDetails | undefined): boolean {
  if (!details) return false;
  return Object.values(details).some(val => {
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object' && val !== null) {
      return Object.values(val).some(v => v && v !== '');
    }
    return val !== undefined && val !== null && val !== '';
  });
}

function ModelingDetailsDisplay({ details }: { details: ModelingDetails }) {
  const measurements = [
    { label: "Height", value: details.height, icon: Ruler },
    { label: "Chest", value: details.chest },
    { label: "Waist", value: details.waist },
    { label: "Hips", value: details.hips },
  ].filter(m => m.value);

  const sizes = [
    { label: "Shoe", value: details.shoe_size },
    { label: "Dress", value: details.dress_size },
    { label: "Top", value: details.top_size },
    { label: "Bottom", value: details.bottom_size },
  ].filter(s => s.value);

  const appearance = [
    { label: "Hair Colour", value: details.hair_colour, icon: Palette },
    { label: "Hair Style", value: details.hair_style, icon: Scissors },
    { label: "Eye Colour", value: details.eye_colour, icon: Eye },
  ].filter(a => a.value);

  if (measurements.length === 0 && sizes.length === 0 && appearance.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-xl border border-pink-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-lg font-semibold text-pink-900 mb-4 flex items-center gap-2">
        <Ruler className="h-5 w-5" />
        Model Details
      </h3>

      {measurements.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-pink-700 mb-2">Measurements</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {measurements.map((m, idx) => (
              <div key={idx} className="bg-white/70 rounded-lg p-3 text-center">
                <p className="text-xs text-pink-600 uppercase">{m.label}</p>
                <p className="text-lg font-semibold text-pink-900">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-pink-700 mb-2 flex items-center gap-1">
            <Shirt className="h-4 w-4" />
            Sizes
          </h4>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s, idx) => (
              <Badge key={idx} className="bg-pink-100 text-pink-800 border-pink-300">
                {s.label}: {s.value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {appearance.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-pink-700 mb-2">Appearance</h4>
          <div className="grid grid-cols-3 gap-3">
            {appearance.map((a, idx) => (
              <div key={idx} className="bg-white/70 rounded-lg p-3">
                <p className="text-xs text-pink-600 flex items-center gap-1">
                  {a.icon && <a.icon className="h-3 w-3" />}
                  {a.label}
                </p>
                <p className="font-medium text-pink-900">{a.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SportsDetailsDisplay({ details }: { details: SportsDetails }) {
  const stats = [
    { label: "Goals", value: details.goals_scored, icon: Target },
    { label: "Assists", value: details.assists, icon: Users },
  ].filter(s => s.value !== undefined && s.value !== null);

  if (!details.sport_type && !details.current_team && !details.league_played && stats.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5" />
        Sports Profile
      </h3>

      {/* Main Info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        {details.sport_type && (
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-xs text-green-600 uppercase">Sport</p>
            <p className="font-semibold text-green-900">{details.sport_type}</p>
          </div>
        )}
        {details.current_team && (
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-xs text-green-600 uppercase">Current Team</p>
            <p className="font-semibold text-green-900">{details.current_team}</p>
          </div>
        )}
        {details.league_played && (
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-xs text-green-600 uppercase">League</p>
            <p className="font-semibold text-green-900">{details.league_played}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-green-700 mb-2">Career Stats</h4>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                className="bg-green-600 text-white rounded-lg p-4 text-center"
                whileHover={{ scale: 1.02 }}
              >
                <stat.icon className="h-6 w-6 mx-auto mb-1 opacity-80" />
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-xs uppercase opacity-80">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Positions */}
      {details.positions_played && details.positions_played.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-green-700 mb-2">Positions</h4>
          <div className="flex flex-wrap gap-2">
            {details.positions_played.map((pos, idx) => (
              <Badge key={idx} className="bg-green-100 text-green-800 border-green-300">
                {pos}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Previous Teams */}
      {details.teams_played && details.teams_played.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-2">Previous Teams</h4>
          <div className="flex flex-wrap gap-2">
            {details.teams_played.map((team, idx) => (
              <Badge key={idx} variant="outline" className="border-green-300 text-green-700">
                {team}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Team Position */}
      {details.team_position_in_league && (
        <div className="mt-4 bg-green-100 rounded-lg p-3 text-center">
          <p className="text-sm text-green-700">Current League Position</p>
          <p className="text-2xl font-bold text-green-900">{details.team_position_in_league}</p>
        </div>
      )}
    </motion.div>
  );
}

function MusicDetailsDisplay({ details }: { details: MusicDetails }) {
  if (!details.genre?.length && !details.record_label && !details.instruments?.length) {
    return null;
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
        <Music className="h-5 w-5" />
        Music Profile
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {details.record_label && (
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-xs text-purple-600 uppercase flex items-center gap-1">
              <Disc className="h-3 w-3" />
              Record Label
            </p>
            <p className="font-semibold text-purple-900">{details.record_label}</p>
          </div>
        )}
        {details.years_active && (
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-xs text-purple-600 uppercase">Years Active</p>
            <p className="font-semibold text-purple-900">{details.years_active}</p>
          </div>
        )}
      </div>

      {details.genre && details.genre.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-purple-700 mb-2">Genre</h4>
          <div className="flex flex-wrap gap-2">
            {details.genre.map((g, idx) => (
              <Badge key={idx} className="bg-purple-600 text-white">
                {g}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {details.instruments && details.instruments.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-purple-700 mb-2">Instruments</h4>
          <div className="flex flex-wrap gap-2">
            {details.instruments.map((inst, idx) => (
              <Badge key={idx} variant="outline" className="border-purple-300 text-purple-700">
                {inst}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Streaming Links */}
      {details.streaming_links && (details.streaming_links.spotify || details.streaming_links.apple_music || details.streaming_links.soundcloud) && (
        <div>
          <h4 className="text-sm font-medium text-purple-700 mb-2">Listen Now</h4>
          <div className="flex gap-3">
            {details.streaming_links.spotify && (
              <motion.a
                href={details.streaming_links.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1DB954] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <Play className="h-4 w-4" />
                Spotify
              </motion.a>
            )}
            {details.streaming_links.apple_music && (
              <motion.a
                href={details.streaming_links.apple_music}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <Play className="h-4 w-4" />
                Apple Music
              </motion.a>
            )}
            {details.streaming_links.soundcloud && (
              <motion.a
                href={details.streaming_links.soundcloud}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FF5500] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <Play className="h-4 w-4" />
                SoundCloud
              </motion.a>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ActingDetailsDisplay({ details }: { details: ActingDetails }) {
  if (!details.acting_type?.length && !details.agencies?.length && !details.notable_roles?.length) {
    return null;
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
        <Film className="h-5 w-5" />
        Acting Profile
      </h3>

      {details.acting_type && details.acting_type.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-amber-700 mb-2">Acting Type</h4>
          <div className="flex flex-wrap gap-2">
            {details.acting_type.map((type, idx) => (
              <Badge key={idx} className="bg-amber-600 text-white">
                {type}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {details.agencies && details.agencies.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
            <Building className="h-4 w-4" />
            Agencies
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.agencies.map((agency, idx) => (
              <Badge key={idx} variant="outline" className="border-amber-300 text-amber-700">
                {agency}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {details.notable_roles && details.notable_roles.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
            <Star className="h-4 w-4" />
            Notable Roles
          </h4>
          <ul className="space-y-1">
            {details.notable_roles.map((role, idx) => (
              <li key={idx} className="text-amber-800 bg-white/70 rounded px-3 py-1">
                {role}
              </li>
            ))}
          </ul>
        </div>
      )}

      {details.training && details.training.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Training
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.training.map((t, idx) => (
              <Badge key={idx} variant="outline" className="border-amber-300 text-amber-700">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function CulinaryDetailsDisplay({ details }: { details: CulinaryDetails }) {
  if (!details.cuisine_specialties?.length && !details.restaurants?.length && !details.certifications?.length) {
    return null;
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center gap-2">
        <ChefHat className="h-5 w-5" />
        Culinary Profile
      </h3>

      {details.cuisine_specialties && details.cuisine_specialties.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
            <UtensilsCrossed className="h-4 w-4" />
            Cuisine Specialties
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.cuisine_specialties.map((cuisine, idx) => (
              <Badge key={idx} className="bg-orange-600 text-white">
                {cuisine}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {details.restaurants && details.restaurants.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
            <Building className="h-4 w-4" />
            Restaurants
          </h4>
          <ul className="space-y-1">
            {details.restaurants.map((restaurant, idx) => (
              <li key={idx} className="text-orange-800 bg-white/70 rounded px-3 py-1">
                {restaurant}
              </li>
            ))}
          </ul>
        </div>
      )}

      {details.certifications && details.certifications.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
            <Award className="h-4 w-4" />
            Certifications
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.certifications.map((cert, idx) => (
              <Badge key={idx} variant="outline" className="border-orange-300 text-orange-700">
                {cert}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {details.tv_appearances && details.tv_appearances.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
            <Tv className="h-4 w-4" />
            TV Appearances
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.tv_appearances.map((show, idx) => (
              <Badge key={idx} variant="outline" className="border-orange-300 text-orange-700">
                {show}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function IndustryDetailsDisplay({ industry, details }: IndustryDetailsDisplayProps) {
  if (!hasDetails(details)) {
    return null;
  }

  switch (industry) {
    case "modeling":
      return <ModelingDetailsDisplay details={details as ModelingDetails} />;
    case "sports":
      return <SportsDetailsDisplay details={details as SportsDetails} />;
    case "music":
      return <MusicDetailsDisplay details={details as MusicDetails} />;
    case "acting":
      return <ActingDetailsDisplay details={details as ActingDetails} />;
    case "culinary":
      return <CulinaryDetailsDisplay details={details as CulinaryDetails} />;
    default:
      return null;
  }
}
