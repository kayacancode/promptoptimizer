'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { UserAuthManager } from '@/lib/user-auth'

export default function SignInPage() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const signIn = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please enter both email and password' })
      return
    }

    setIsSigningIn(true)
    setMessage(null)

    try {
      const result = await UserAuthManager.signIn(email, password)
      if (result.success) {
        setMessage({ type: 'success', text: 'Welcome back! Redirecting...' })
        // Redirect to main app after successful sign-in
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } else {
        setMessage({ type: 'error', text: result.error || 'Sign in failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sign in failed' })
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      signIn()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your PromptLoop account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LogIn className="h-5 w-5 mr-2" />
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            
            <Button 
              onClick={signIn} 
              disabled={isSigningIn || !email || !password}
              className="w-full"
              size="lg"
            >
              {isSigningIn ? 'Signing In...' : 'Sign In'}
            </Button>
            
            <div className="text-center space-y-2">
              <Button 
                variant="link" 
                onClick={() => window.location.href = '/'}
                className="text-sm"
              >
                Don't have an account? Sign up on the home page
              </Button>
              
              <div className="text-xs text-gray-500">
                New to bestmate? You'll get 10 free optimization tokens per day!
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        {message && (
          <Alert className={`mt-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {message.type === 'success' ? 
              <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
              <AlertCircle className="h-4 w-4 text-red-600" />
            }
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
} 