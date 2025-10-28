"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
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
  DollarSign
} from "lucide-react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  talentId: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    const mockUser = localStorage.getItem('talent_user');
    if (mockUser) {
      setUser(JSON.parse(mockUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (email: string) => {
    const mockUsers = [
      { id: '1', name: 'Deejay WG', email: 'deejay@versatalent.com', talentId: '1' },
      { id: '2', name: 'Jessica Dias', email: 'jessica@versatalent.com', talentId: '2' },
      { id: '3', name: 'João Rodolfo', email: 'joao@versatalent.com', talentId: '3' },
      { id: '4', name: 'Antonio Monteiro', email: 'antonio@versatalent.com', talentId: '4' },
    ];

    const user = mockUsers.find(u => u.email === email);
    if (user) {
      setUser(user);
      localStorage.setItem('talent_user', JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('talent_user');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <motion.div
              className="max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Talent <span className="text-gold">Dashboard</span>
                </h1>
                <p className="text-gray-600">
                  Sign in to manage your portfolio and profile
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  />
                  <Input
                    type="password"
                    placeholder="Password (any value works)"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  />
                  <Button
                    className="w-full bg-gold hover:bg-gold-80"
                    onClick={() => handleLogin(loginForm.email)}
                  >
                    Sign In
                  </Button>

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2">Quick Access:</p>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full text-left justify-start"
                        onClick={() => handleLogin('deejay@versatalent.com')}
                      >
                        Deejay WG
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-left justify-start"
                        onClick={() => handleLogin('jessica@versatalent.com')}
                      >
                        Jessica Dias
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-left justify-start"
                        onClick={() => handleLogin('joao@versatalent.com')}
                      >
                        João Rodolfo
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-left justify-start"
                        onClick={() => handleLogin('antonio@versatalent.com')}
                      >
                        Antonio Monteiro
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome back, <span className="text-gold">{user.name}</span>
                </h1>
                <p className="text-gray-600">Manage your portfolio and track your performance</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Navigation Tabs */}
          <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Analytics', icon: BarChart3 },
              { id: 'portfolio', label: 'Portfolio', icon: Grid },
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
              <AnalyticsDashboard
                talentId={user.talentId}
                talentName={user.name}
              />
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
