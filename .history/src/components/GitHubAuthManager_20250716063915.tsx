'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, CheckCircle2, AlertCircle, Zap, LogIn, LogOut, User, Github } from 'lucide-react'
import { UserAuthManager, UserTokens } from '@/lib/user-auth'

export function GitHubAuthManager() {
  const { data: session, status } = useSession()
  const [userTokens, setUserTokens] = useState<UserTokens | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load user tokens when session is available
  useEffect(() => {
    if (session?.user?.email) {
      loadUserTokens()
    }
  }, [session])

  const loadUserTokens = async () => {
    if (!session?.user?.email) return
    
    setIsLoading(true)
    try {
      // Find or create user from GitHub session
      const userResult = await UserAuthManager.findOrCreateUserFromGitHub(
        session.user.email,
        session.user.name || undefined
      )
      
      if (userResult.success && userResult.userId) {
        const tokens = await UserAuthManager.getUserTokens(userResult.userId)
        setUserTokens(tokens)
        
        if (!tokens) {
          setMessage({ 
            type: 'error', 
            text: 'Failed to load user tokens. Please try refreshing or contact support.' 
          })
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: userResult.error || 'Failed to initialize user account' 
        })
      }
    } catch (error) {
      console.error('Error loading user tokens:', error)
      setMessage({ type: 'error', text: 'Failed to load user data' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async () => {
    try {
      await signIn('github')
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sign in with GitHub' })
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUserTokens(null)
      setMessage({ type: 'success', text: 'Signed out successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Sign out failed' })
    }
  }

  const refreshTokens = async () => {
    await loadUserTokens()
  }

  if (status === 'loading') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {!session ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Github className="h-5 w-5 mr-2" />
              Connect with GitHub
            </CardTitle>
            <CardDescription>
              Sign in with your GitHub account to get started with PromptLoop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>✨ <strong>What you get:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>10 free optimization tokens per day</li>
                <li>Access to your GitHub repositories</li>
                <li>Prompt history tracking</li>
                <li>Usage analytics</li>
                <li>AI-powered prompt optimization</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleSignIn}
              className="w-full"
              size="lg"
            >
              <Github className="h-5 w-5 mr-2" />
              Sign in with GitHub
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>No account needed - we'll create one automatically!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Welcome, {session.user?.name || session.user?.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardTitle>
              <CardDescription>
                Connected via GitHub • {session.user?.email}
              </CardDescription>
            </CardHeader>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2">Loading your tokens...</span>
                </div>
              </CardContent>
            </Card>
          ) : userTokens ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Your Tokens
                  </span>
                  <Button variant="outline" size="sm" onClick={refreshTokens}>
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Tokens Remaining</p>
                    <p className="text-2xl font-bold text-green-600">
                      {userTokens.usageTokens}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Used Today</p>
                    <p className="text-2xl font-bold">
                      {userTokens.dailyOptimizations}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
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
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total optimizations</span>
                    <span>{userTokens.totalOptimizations}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
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
                    <strong>Beta Version:</strong> <span className="text-sm">You get 10 free tokens per day. Tokens reset daily at midnight.</span>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">Unable to load token information</p>
                  <Button onClick={refreshTokens} variant="outline">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
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