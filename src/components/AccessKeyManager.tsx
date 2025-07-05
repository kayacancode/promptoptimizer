'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Key, CheckCircle2, AlertCircle, Zap } from 'lucide-react'

interface AccessKeyInfo {
  tier: string
  dailyLimit: number
  optimizationsToday: number
  remaining: number
  totalUsed: number
  createdAt: string
}

export function AccessKeyManager() {
  const [accessKey, setAccessKey] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [keyInfo, setKeyInfo] = useState<AccessKeyInfo | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('promptloop_access_key')
    if (savedKey) {
      setAccessKey(savedKey)
      loadKeyInfo(savedKey)
    }
  }, [])

  const generateKey = async () => {
    setIsGenerating(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined })
      })
      
      const result = await response.json()
      
      if (result.success) {
        const newKey = result.data.accessKey
        setAccessKey(newKey)
        localStorage.setItem('promptloop_access_key', newKey)
        
        setMessage({ type: 'success', text: result.message })
        await loadKeyInfo(newKey)
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate access key' })
    } finally {
      setIsGenerating(false)
    }
  }

  const loadKeyInfo = async (key: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/keys/generate?key=${encodeURIComponent(key)}`)
      const result = await response.json()
      
      if (result.success) {
        setKeyInfo(result.data)
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load key information' })
    } finally {
      setIsLoading(false)
    }
  }

  const copyKey = async () => {
    if (accessKey) {
      try {
        await navigator.clipboard.writeText(accessKey)
        setMessage({ type: 'success', text: 'Access key copied to clipboard!' })
        setTimeout(() => setMessage(null), 3000)
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to copy key' })
      }
    }
  }

  const refreshKeyInfo = () => {
    if (accessKey) {
      loadKeyInfo(accessKey)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'trial': return 'bg-gray-100 text-gray-800'
      case 'premium': return 'bg-blue-100 text-blue-800'
      case 'unlimited': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {!accessKey ? (
        /* Key Generation */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              Get Your Access Key
            </CardTitle>
            <CardDescription>
              Generate a free access key to start optimizing prompts with PromptLoop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll only use this to contact you about important updates
              </p>
            </div>
            
            <Button 
              onClick={generateKey} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Generating...' : 'Generate Free Access Key'}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p>✨ <strong>Trial tier includes:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>3 prompt optimizations per day</li>
                <li>Global prompt insights</li>
                <li>AI-enhanced optimization</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Key Management */
        <div className="space-y-6">
          {/* Key Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Your Access Key
                </span>
                <Button variant="outline" size="sm" onClick={refreshKeyInfo}>
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input 
                  value={accessKey} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={copyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Keep this key safe! You'll need it to access PromptLoop.
              </p>
            </CardContent>
          </Card>

          {/* Usage Information */}
          {keyInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Usage & Limits
                  </span>
                  <Badge className={getTierColor(keyInfo.tier)}>
                    {keyInfo.tier.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Today's Usage</p>
                    <p className="text-2xl font-bold">
                      {keyInfo.optimizationsToday} / {keyInfo.dailyLimit}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Remaining</p>
                    <p className="text-2xl font-bold text-green-600">
                      {keyInfo.remaining}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Progress</span>
                    <span>{keyInfo.optimizationsToday} / {keyInfo.dailyLimit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (keyInfo.optimizationsToday / keyInfo.dailyLimit) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total optimizations used</span>
                    <span>{keyInfo.totalUsed}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Key created</span>
                    <span>{new Date(keyInfo.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {keyInfo.tier === 'trial' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Want more optimizations? Contact us about upgrading to Premium (50/day) or Unlimited tiers.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Messages */}
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