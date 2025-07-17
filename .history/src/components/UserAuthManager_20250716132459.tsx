'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, CheckCircle2, AlertCircle, Zap, LogIn, LogOut, User } from 'lucide-react'
import { UserAuthManager, UserTokens } from '@/lib/user-auth'
// import Cookies from 'js-cookie' // No longer needed

export function UserAuthComponent() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [userTokens, setUserTokens] = useState<UserTokens | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    const user = await UserAuthManager.getCurrentUser()
    if (user) {
      setCurrentUser(user)
      setIsSignedIn(true)
      setEmail(user.email || '')
      await loadUserTokens(user.id)
    }
  }

  const loadUserTokens = async (userId: string) => {
    setIsLoading(true)
    try {
      const tokens = await UserAuthManager.getUserTokens(userId)
      setUserTokens(tokens)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load user tokens' })
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async () => {
    if (!email || !password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setIsSigningUp(true)
    setMessage(null)

    try {
      const result = await UserAuthManager.signUp(email, password)
      if (result.success) {
        setCurrentUser(result.user)
        setIsSignedIn(true)
        setMessage({ type: 'success', text: 'Account created successfully! You have 10 free tokens per day.' })
        await loadUserTokens(result.user.id)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create account' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create account' })
    } finally {
      setIsSigningUp(false)
    }
  }

  const signIn = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please enter both email and password' })
      return
    }

    setIsSigningIn(true)
    setMessage(null)

    try {
      const result = await UserAuthManager.signIn(email, password)
      if (result.success && result.session) {
        setCurrentUser(result.user)
        setIsSignedIn(true)
        setMessage({ type: 'success', text: 'Welcome back!' })

        // No longer need to manually set cookies
        // Cookies.set('sb-access-token', result.session.access_token)
        // Cookies.set('sb-refresh-token', result.session.refresh_token)

        await loadUserTokens(result.user.id)
      } else {
        setMessage({ type: 'error', text: result.error || 'Sign in failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sign in failed' })
    } finally {
      setIsSigningIn(false)
    }
  }

  const signOut = async () => {
    try {
      await UserAuthManager.signOut()
      setCurrentUser(null)
      setIsSignedIn(false)
      setUserTokens(null)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setMessage({ type: 'success', text: 'Signed out successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Sign out failed' })
    }
  }

  const refreshTokens = async () => {
    if (currentUser) {
      await loadUserTokens(currentUser.id)
    }
  }

  return (
    <div className="space-y-6">
      {!isSignedIn ? (
        /* Authentication Forms */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {showSignIn ? <LogIn className="h-5 w-5 mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
              {showSignIn ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {showSignIn 
                ? 'Welcome back! Sign in to access your tokens.' 
                : 'Create your account to get 10 free optimization tokens per day (Beta)'
              }
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={showSignIn ? 'Enter your password' : 'Create a secure password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!showSignIn && (
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              )}
            </div>
            
            {!showSignIn && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
            
            <Button 
              onClick={showSignIn ? signIn : signUp} 
              disabled={(showSignIn ? isSigningIn : isSigningUp) || !email || !password || (!showSignIn && !confirmPassword)}
              className="w-full"
              size="lg"
            >
              {showSignIn 
                ? (isSigningIn ? 'Signing In...' : 'Sign In')
                : (isSigningUp ? 'Creating Account...' : 'Create Account')
              }
            </Button>
            
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => {
                  if (showSignIn) {
                    setShowSignIn(false)
                    setMessage(null)
                    setPassword('')
                    setConfirmPassword('')
                  } else {
                    // Redirect to dedicated sign-in page
                    window.location.href = '/signin'
                  }
                }}
                className="text-sm"
              >
                {showSignIn ? 'Need an account? Sign up here' : 'Already have an account? Sign in here'}
              </Button>
            </div>
            
            {!showSignIn && (
              <div className="text-sm text-muted-foreground">
                <p>✨ <strong>Beta Features:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>10 free optimization tokens per day</li>
                  <li>Prompt history tracking</li>
                  <li>Usage analytics</li>
                  <li>AI-powered optimization</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* User Dashboard */
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center text-black">
                  <User className="h-5 w-5 mr-2 text-black" />
                  Welcome, {currentUser?.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2 text-black"/>
                  Sign Out
                </Button>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Token Usage */}
          {userTokens && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-black">
                  <span className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-black" />
                    Your Tokens
                  </span>
                  <Button variant="outline" size="sm" onClick={refreshTokens}>
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-black">
                  <div className="space-y-1">
                    <p className="text-sm font-medium font-black">Tokens Remaining</p>
                    <p className="text-2xl font-bold text-green-600">
                      {userTokens.usageTokens}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-black">Used Today</p>
                    <p className="text-2xl font-bold text-black">
                      {userTokens.dailyOptimizations}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-black">
                    <span>Daily Progress</span>
                    <span>{userTokens.dailyOptimizations} / 10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (userTokens.dailyOptimizations / 10) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm text-black">
                    <span>Total optimizations</span>
                    <span>{userTokens.totalOptimizations}</span>
                  </div>
                  <div className="flex justify-between text-sm text-black">
                    <span>Account created</span>
                    <span>{new Date(userTokens.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {userTokens.usageTokens === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You've used all your tokens for today. They'll reset at midnight!
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong className='text-black'>Beta Version:</strong> You get 10 free tokens per day. Tokens reset daily at midnight.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Messages */}
      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50' }>
          {message.type === 'success' ? 
            <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
            <AlertCircle className="h-4 w-4 text-red-600" />
          }
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}