'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { Coins, Zap, RefreshCw } from 'lucide-react'

interface TokenBalanceData {
  tokenBalance: number
  dailyTokenLimit: number
  tokensUsedToday: number
  remainingDailyTokens: number
  totalOptimizations: number
}

interface TokenBalanceProps {
  compact?: boolean
}

export function TokenBalance({ compact = false }: TokenBalanceProps) {
  const [balance, setBalance] = useState<TokenBalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('Please sign in to view token balance')
        return
      }

      const response = await fetch('/api/user/balance', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      
      if (result.success) {
        setBalance(result.data)
      } else {
        setError(result.error || 'Failed to fetch balance')
      }
    } catch (err) {
      console.error('Error fetching balance:', err)
      setError('Failed to fetch balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
        <RefreshCw className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} animate-spin text-muted-foreground`} />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
        <Coins className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-red-500`} />
        <span className="text-red-500">{error}</span>
      </div>
    )
  }

  if (!balance) {
    return null
  }

  const dailyUsagePercent = (balance.tokensUsedToday / balance.dailyTokenLimit) * 100
  const isLowBalance = balance.tokenBalance < 1000
  const isHighDailyUsage = dailyUsagePercent > 80

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <Coins className={`h-4 w-4 ${isLowBalance ? 'text-red-500' : 'text-green-500'}`} />
          <span className={`text-sm font-medium ${isLowBalance ? 'text-red-500' : 'text-green-500'}`}>
            {balance.tokenBalance.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <Zap className={`h-4 w-4 ${isHighDailyUsage ? 'text-orange-500' : 'text-blue-500'}`} />
          <span className={`text-sm ${isHighDailyUsage ? 'text-orange-500' : 'text-blue-500'}`}>
            {balance.remainingDailyTokens}/{balance.dailyTokenLimit} opts
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Token Balance</h3>
          <Badge variant={isLowBalance ? "destructive" : "secondary"}>
            {isLowBalance ? "Low Balance" : "Active"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Coins className={`h-5 w-5 ${isLowBalance ? 'text-red-500' : 'text-green-500'}`} />
              <span className="text-sm font-medium">Total Balance</span>
            </div>
            <div className={`text-2xl font-bold ${isLowBalance ? 'text-red-500' : 'text-green-500'}`}>
              {balance.tokenBalance.toLocaleString()}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Zap className={`h-5 w-5 ${isHighDailyUsage ? 'text-orange-500' : 'text-blue-500'}`} />
              <span className="text-sm font-medium">Daily Optimizations</span>
            </div>
            <div className={`text-2xl font-bold ${isHighDailyUsage ? 'text-orange-500' : 'text-blue-500'}`}>
              {balance.remainingDailyTokens}/{balance.dailyTokenLimit}
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Daily Optimizations Used</span>
            <span className={isHighDailyUsage ? 'text-orange-500' : 'text-muted-foreground'}>
              {balance.tokensUsedToday}/{balance.dailyTokenLimit}
            </span>
          </div>
          <Progress 
            value={dailyUsagePercent} 
            className={`h-2 ${isHighDailyUsage ? '[&>div]:bg-orange-500' : '[&>div]:bg-blue-500'}`}
          />
        </div>
        
        {isLowBalance && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-300">
                Low token balance. Consider upgrading your plan.
              </span>
            </div>
          </div>
        )}
        
        {isHighDailyUsage && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700 dark:text-orange-300">
                High daily usage. {balance.remainingDailyTokens} optimizations left today.
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}