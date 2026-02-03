"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Check,
  ChevronDown,
  Search,
  User,
  Music,
  Film,
  Camera,
  ChefHat,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Talent, Industry } from "@/lib/db/types";

interface TalentMultiSelectProps {
  talents: Talent[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  loading?: boolean;
  placeholder?: string;
}

const industryIcons: Record<Industry, React.ReactNode> = {
  music: <Music className="h-4 w-4" />,
  acting: <Film className="h-4 w-4" />,
  modeling: <Camera className="h-4 w-4" />,
  culinary: <ChefHat className="h-4 w-4" />,
  sports: <Trophy className="h-4 w-4" />,
};

const industryColors: Record<Industry, string> = {
  music: "bg-purple-100 text-purple-800 border-purple-200",
  acting: "bg-amber-100 text-amber-800 border-amber-200",
  modeling: "bg-pink-100 text-pink-800 border-pink-200",
  culinary: "bg-orange-100 text-orange-800 border-orange-200",
  sports: "bg-green-100 text-green-800 border-green-200",
};

export function TalentMultiSelect({
  talents,
  selectedIds,
  onChange,
  loading = false,
  placeholder = "Select talents...",
}: TalentMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter talents based on search
  const filteredTalents = talents.filter((talent) => {
    const search = searchTerm.toLowerCase();
    return (
      talent.name.toLowerCase().includes(search) ||
      talent.profession.toLowerCase().includes(search) ||
      talent.industry.toLowerCase().includes(search)
    );
  });

  // Get selected talents
  const selectedTalents = talents.filter((t) => selectedIds.includes(t.id));

  // Toggle talent selection
  const toggleTalent = (talentId: string) => {
    if (selectedIds.includes(talentId)) {
      onChange(selectedIds.filter((id) => id !== talentId));
    } else {
      onChange([...selectedIds, talentId]);
    }
  };

  // Remove a selected talent
  const removeTalent = (talentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((id) => id !== talentId));
  };

  // Clear all selections
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Talents Display / Trigger */}
      <div
        className={`min-h-[42px] w-full border rounded-md px-3 py-2 cursor-pointer bg-white transition-colors ${
          isOpen ? "border-gold ring-2 ring-gold/20" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        {selectedTalents.length === 0 ? (
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-sm">{loading ? "Loading talents..." : placeholder}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {selectedTalents.map((talent) => (
              <Badge
                key={talent.id}
                className={`${industryColors[talent.industry]} flex items-center gap-1 pr-1`}
              >
                {industryIcons[talent.industry]}
                <span>{talent.name}</span>
                <button
                  type="button"
                  onClick={(e) => removeTalent(talent.id, e)}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedTalents.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-gray-700 ml-2"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search talents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Talents List */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="py-4 text-center text-gray-500 text-sm">
                  Loading talents...
                </div>
              ) : filteredTalents.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">
                  {searchTerm ? "No talents found" : "No talents available"}
                </div>
              ) : (
                filteredTalents.map((talent) => {
                  const isSelected = selectedIds.includes(talent.id);
                  const imageSrc = (talent as any).imageSrc || talent.image_src;

                  return (
                    <button
                      key={talent.id}
                      type="button"
                      onClick={() => toggleTalent(talent.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-gold/10 hover:bg-gold/20"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Talent Avatar */}
                      <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={talent.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                        )}
                      </div>

                      {/* Talent Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {talent.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {industryIcons[talent.industry]}
                          <span className="capitalize">{talent.industry}</span>
                          <span className="text-gray-300">•</span>
                          <span className="truncate">{talent.profession}</span>
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div
                        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-gold border-gold text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer with count */}
            {selectedIds.length > 0 && (
              <div className="border-t px-3 py-2 bg-gray-50 text-xs text-gray-600">
                {selectedIds.length} talent{selectedIds.length !== 1 ? "s" : ""} selected
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
