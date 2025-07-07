import { NextRequest, NextResponse } from 'next/server'
import { SupabaseAccessKeyManager } from '@/lib/supabase-access-keys'
import { APIResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Simple admin protection - check for admin key in headers
    const adminKey = request.headers.get('X-Admin-Key')
    
    // You can set this in your environment or hardcode for now
    const expectedAdminKey = process.env.ADMIN_KEY || 'admin-prompt-loop-2024'
    
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required'
      } as APIResponse, { status: 401 })
    }

    const stats = await SupabaseAccessKeyManager.getKeyStats()
    const allKeys = await SupabaseAccessKeyManager.getAllKeys()
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentKeys = allKeys.filter(key => 
      new Date(key.createdAt) > sevenDaysAgo
    )

    const recentActivity = allKeys.filter(key => 
      new Date(key.updatedAt) > sevenDaysAgo
    )

    return NextResponse.json({
      success: true,
      data: {
        overview: stats,
        recentKeys: recentKeys.length,
        activeThisWeek: recentActivity.length,
        keyBreakdown: {
          trial: {
            count: stats.trialKeys,
            avgOptimizations: Math.round(
              allKeys.filter(k => k.tier === 'trial')
                    .reduce((sum, k) => sum + k.dailyUsage, 0) / stats.trialKeys || 0
            )
          },
          premium: {
            count: stats.premiumKeys,
            avgOptimizations: Math.round(
              allKeys.filter(k => k.tier === 'premium')
                    .reduce((sum, k) => sum + k.dailyUsage, 0) / stats.premiumKeys || 0
            )
          },
          unlimited: {
            count: stats.unlimitedKeys,
            avgOptimizations: Math.round(
              allKeys.filter(k => k.tier === 'unlimited')
                    .reduce((sum, k) => sum + k.dailyUsage, 0) / stats.unlimitedKeys || 0
            )
          }
        },
        topUsers: allKeys
          .sort((a, b) => b.dailyUsage - a.dailyUsage)
          .slice(0, 10)
          .map(key => ({
            keyPrefix: key.key.substring(0, 8) + '...',
            tier: key.tier,
            optimizationsUsed: key.dailyUsage,
            email: 'No email', // Email is not available in this context
            lastUsed: key.updatedAt,
            createdAt: key.createdAt
          }))
      },
      message: 'Access key statistics retrieved successfully'
    } as APIResponse)
  } catch (error) {
    console.error('Stats retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve stats'
    } as APIResponse, { status: 500 })
  }
}