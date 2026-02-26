"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { type Talent, type Industry } from "@/lib/data/talents";

export default function TalentsPage() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [filteredTalents, setFilteredTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch talents from API
  useEffect(() => {
    const fetchTalents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/talents');
        const data = await response.json();
        setTalents(data);
      } catch (error) {
        console.error('Error fetching talents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTalents();
  }, []);

  // Process URL params for industry filter
  useEffect(() => {
    const url = new URL(window.location.href);
    const industryParam = url.searchParams.get("industry");

    if (industryParam && ["acting", "modeling", "music", "culinary", "sports"].includes(industryParam)) {
      setSelectedIndustry(industryParam as Industry);
    }
  }, []);

  // Filter talents based on selected industry and search term
  useEffect(() => {
    let result = talents;

    // Filter by industry
    if (selectedIndustry !== "all") {
      result = result.filter((talent) => talent.industry === selectedIndustry);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (talent) =>
          talent.name.toLowerCase().includes(term) ||
          talent.tagline.toLowerCase().includes(term) ||
          talent.skills.some(skill => skill.toLowerCase().includes(term))
      );
    }

    setFilteredTalents(result);
  }, [selectedIndustry, searchTerm, talents]);

  // Handle industry filter click
  const handleIndustryChange = (industry: Industry | "all") => {
    setSelectedIndustry(industry);

    // Update URL without page reload
    const url = new URL(window.location.href);
    if (industry === "all") {
      url.searchParams.delete("industry");
    } else {
      url.searchParams.set("industry", industry);
    }
    window.history.pushState({}, "", url);
  };

  const container = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 1, y: 0 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <MainLayout>
      <div className="bg-white py-16">
        <div className="container px-4 mx-auto">
          <div
            className="max-w-3xl mx-auto text-center mb-12"
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Talent <span className="text-gold">Directory</span>
            </h1>
            <p className="text-gray-600">
              Discover our exceptional roster of talent across various industries.
              Use the filters below to find the perfect match for your next project.
            </p>
          </div>

          {/* Search and Filters */}
          <div
            className="mb-12"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, skill, or keyword..."
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleIndustryChange("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedIndustry === "all"
                    ? "bg-gold text-white shadow-md"
                    : "bg-gray-100 text-foreground hover:bg-gray-200"
                }`}
              >
                All Industries
              </button>
              <button
                onClick={() => handleIndustryChange("acting")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedIndustry === "acting"
                    ? "bg-gold text-white shadow-md"
                    : "bg-gray-100 text-foreground hover:bg-gray-200"
                }`}
              >
                Acting
              </button>
              <button
                onClick={() => handleIndustryChange("modeling")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedIndustry === "modeling"
                    ? "bg-gold text-white shadow-md"
                    : "bg-gray-100 text-foreground hover:bg-gray-200"
                }`}
              >
                Modeling
              </button>
              <button
                onClick={() => handleIndustryChange("music")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedIndustry === "music"
                    ? "bg-gold text-white shadow-md"
                    : "bg-gray-100 text-foreground hover:bg-gray-200"
                }`}
              >
                Music
              </button>
              <button
                onClick={() => handleIndustryChange("culinary")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedIndustry === "culinary"
                    ? "bg-gold text-white shadow-md"
                    : "bg-gray-100 text-foreground hover:bg-gray-200"
                }`}
              >
                Culinary Arts
              </button>
              <button
                onClick={() => handleIndustryChange("sports")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedIndustry === "sports"
                    ? "bg-gold text-white shadow-md"
                    : "bg-gray-100 text-foreground hover:bg-gray-200"
                }`}
              >
                Sports
              </button>
            </div>
          </div>

          {/* Talent grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading talents...</p>
            </div>
          ) : filteredTalents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTalents.map((talent, index) => (
                <div key={talent.id} className="animate-in fade-in duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                  <Link href={`/talents/${talent.id}`} className="block h-full">
                    <Card className="overflow-hidden bg-white border border-gray-200 hover:border-gold transition-all duration-300 h-full shadow-sm">
                      <div className="relative h-80 w-full overflow-hidden">
                        <Image
                          src={talent.cover_image || talent.imageSrc}
                          alt={talent.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          quality={80}
                          className="object-cover transition-transform duration-500 hover:scale-105"
                          loading={index < 6 ? "eager" : "lazy"}
                        />
                      </div>
                      <CardContent className="p-6">
                        <h2 className="font-bold text-foreground text-xl mb-1">{talent.name}</h2>
                        <p className="text-gray-500 mb-3 text-sm">{talent.location}</p>
                        <p className="text-gray-600 mb-4">{talent.tagline}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-gold border-gold-20">
                            {talent.industry.charAt(0).toUpperCase() + talent.industry.slice(1)}
                          </Badge>
                          {talent.skills.slice(0, 2).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-gray-600 border-gray-200">
                              {skill}
                            </Badge>
                          ))}
                          {talent.skills.length > 2 && (
                            <Badge variant="outline" className="text-gray-500 border-gray-200">
                              +{talent.skills.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-in fade-in duration-500">
              <h3 className="text-xl text-foreground mb-2">No talents found</h3>
              <p className="text-gray-500">Try adjusting your filters or search term</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
