"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { useAuth, withAuth } from "@/lib/auth";
import {
  BarChart3,
  Upload,
  Settings,
  User,
  Eye,
  Heart,
  Star,
  LogOut,
  Menu,
  Grid,
  List,
  TrendingUp,
  MessageCircle,
  Award,
  DollarSign,
  Shield,
  Crown
} from "lucide-react";

function DashboardPage() {
  const { user, isAdmin, isTalent } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Map email to talent ID for analytics
  const getTalentId = (email: string) => {
    const emailToIdMap: { [key: string]: string } = {
      'jessica@versatalent.com': 'jessicadias',
      'deejaywg@versatalent.com': 'deejaywg',
      'joao@versatalent.com': 'joaorodolfo',
      'antonio@versatalent.com': 'antoniomonteiro',
      'admin@versatalent.com': 'admin'
    };
    return emailToIdMap[email] || 'admin';
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      Welcome back, <span className="text-gold">{user?.name}</span>
                    </h1>
                    {isAdmin && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Crown className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {isTalent && (
                      <Badge variant="secondary" className="bg-gold-20 text-gold">
                        <Star className="w-3 h-3 mr-1" />
                        Talent
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600">
                    {isAdmin
                      ? 'Manage the platform and view all talent analytics'
                      : 'Manage your portfolio and track your performance'
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Navigation Tabs */}
          <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {[
              { id: 'overview', label: 'Analytics', icon: BarChart3, roles: ['admin', 'talent'] },
              { id: 'portfolio', label: 'Portfolio', icon: Grid, roles: ['talent'] },
              { id: 'upload', label: 'Upload', icon: Upload, roles: ['talent'] },
              { id: 'users', label: 'User Management', icon: Shield, roles: ['admin'] },
              { id: 'profile', label: 'Profile', icon: User, roles: ['admin', 'talent'] },
              { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'talent'] },
            ]
              .filter(tab => tab.roles.includes(user?.role || ''))
              .map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-white text-gold shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {isAdmin ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-purple-600" />
                        Admin Analytics Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        Select a talent to view their detailed analytics, or view platform-wide metrics.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { name: 'Jessica Dias', id: 'jessicadias' },
                          { name: 'Deejay WG', id: 'deejaywg' },
                          { name: 'João Rodolfo', id: 'joaorodolfo' },
                          { name: 'Antonio Monteiro', id: 'antoniomonteiro' }
                        ].map((talent) => (
                          <Button
                            key={talent.id}
                            variant="outline"
                            className="h-auto p-4 text-left"
                            onClick={() => {
                              // This would typically navigate to a talent-specific dashboard
                              alert(`Viewing analytics for ${talent.name}`);
                            }}
                          >
                            <div>
                              <p className="font-medium">{talent.name}</p>
                              <p className="text-xs text-gray-500">View Analytics</p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Show default admin analytics */}
                  <AnalyticsDashboard
                    talentId="admin"
                    talentName="Platform Overview"
                  />
                </div>
              ) : (
                <AnalyticsDashboard
                  talentId={getTalentId(user?.email || '')}
                  talentName={user?.name || 'User'}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'portfolio' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Grid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Portfolio Manager</h3>
                    <p className="text-gray-600 mb-6">
                      Advanced portfolio management features including drag & drop reordering,
                      bulk editing, and comprehensive metadata management.
                    </p>
                    <Button className="bg-gold hover:bg-gold-80">
                      Launch Portfolio Manager
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Upload Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Drag & Drop Upload</h3>
                    <p className="text-gray-600 mb-6">
                      Drag files here or click to browse. Supports images and videos
                      with automatic optimization and metadata extraction.
                    </p>
                    <Button className="bg-gold hover:bg-gold-80">
                      Select Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'users' && isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: 'Admin User', email: 'admin@versatalent.com', role: 'Admin', status: 'Active' },
                        { name: 'Jessica Dias', email: 'jessica@versatalent.com', role: 'Talent', status: 'Active' },
                        { name: 'Deejay WG', email: 'deejaywg@versatalent.com', role: 'Talent', status: 'Active' },
                        { name: 'João Rodolfo', email: 'joao@versatalent.com', role: 'Talent', status: 'Active' },
                        { name: 'Antonio Monteiro', email: 'antonio@versatalent.com', role: 'Talent', status: 'Active' },
                      ].map((user, index) => (
                        <Card key={index} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{user.name}</h4>
                              <Badge variant="outline" className={user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-gold-20 text-gold'}>
                                {user.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-gray-600">{user.status}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {['profile', 'settings'].includes(activeTab) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>{activeTab === 'profile' ? 'Profile Settings' : 'Account Settings'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {activeTab === 'profile' ? 'Profile Management' : 'Settings Panel'}
                    </h3>
                    <p className="text-gray-600">
                      {activeTab === 'profile'
                        ? 'Edit your bio, skills, contact information, and public profile settings.'
                        : 'Manage account preferences, privacy settings, and notification options.'
                      }
                    </p>
                    <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Name:</span>
                        <span className="text-sm font-medium">{user?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium">{user?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Role:</span>
                        <span className="text-sm font-medium capitalize">{user?.role}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// Wrap the component with authentication protection
export default withAuth(DashboardPage, {
  redirectTo: '/auth/signin'
});
