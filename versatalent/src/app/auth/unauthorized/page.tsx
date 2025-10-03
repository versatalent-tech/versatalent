'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Home, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function Unauthorized() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              <span className="text-gold">V</span>ersaTalent
            </div>
          </Link>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this resource
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {isAuthenticated
                  ? `Your current role (${user?.role}) doesn't have access to this page. Please contact an administrator if you believe this is an error.`
                  : 'You need to be signed in to access this page.'
                }
              </AlertDescription>
            </Alert>

            {isAuthenticated && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Your Account</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-medium">{user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="font-medium capitalize">{user?.role}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={() => router.back()}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/dashboard">
                      <Home className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="w-full">
                    <Link href="/auth/signin">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    onClick={() => router.back()}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/contact" className="text-gold hover:underline font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
