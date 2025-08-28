'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Chrome, Github, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const authError = searchParams?.get('error');

  useEffect(() => {
    // Check if user is already authenticated
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl);
      }
    });

    // Show error if there's an auth error in URL
    if (authError) {
      setError('Authentication failed. Please try again.');
    }
  }, [callbackUrl, authError, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push(callbackUrl);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    setLoading(true);
    await signIn(provider, { callbackUrl });
  };

  const demoAccounts = [
    { email: 'admin@versatalent.com', password: 'admin123', role: 'Admin', description: 'Full dashboard access' },
    { email: 'jessica@versatalent.com', password: 'password', role: 'Talent', description: 'Jessica Dias profile' },
    { email: 'deejaywg@versatalent.com', password: 'password', role: 'Talent', description: 'Deejay WG profile' },
    { email: 'joao@versatalent.com', password: 'password', role: 'Talent', description: 'João Rodolfo profile' },
    { email: 'antonio@versatalent.com', password: 'password', role: 'Talent', description: 'Antonio Monteiro profile' }
  ];

  const fillDemoCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to access your analytics dashboard</p>
        </div>

        {/* Main Sign In Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/auth/forgot-password" className="text-sm text-gold hover:underline">
                Forgot your password?
              </Link>
            </div>

            {/* Social Sign In */}
            <div className="space-y-3">
              <Separator />
              <p className="text-center text-sm text-gray-600">Or continue with</p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSocialSignIn('google')}
                  disabled={loading}
                  className="w-full"
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocialSignIn('github')}
                  disabled={loading}
                  className="w-full"
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Demo Accounts
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDemoCredentials(!showDemoCredentials)}
              >
                {showDemoCredentials ? 'Hide' : 'Show'}
              </Button>
            </CardTitle>
          </CardHeader>
          {showDemoCredentials && (
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-600 mb-3">
                Click any account below to auto-fill credentials:
              </p>
              {demoAccounts.map((account, index) => (
                <div
                  key={index}
                  onClick={() => fillDemoCredentials(account.email, account.password)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{account.email}</p>
                      <p className="text-xs text-gray-600">{account.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-gold/20 text-gold px-2 py-1 rounded">
                        {account.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  These are demo accounts for testing. All use password: <code className="bg-gray-100 px-1 rounded">password</code> (admin uses <code className="bg-gray-100 px-1 rounded">admin123</code>)
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-gold hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
