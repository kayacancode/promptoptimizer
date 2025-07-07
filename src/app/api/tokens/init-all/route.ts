import { NextRequest, NextResponse } from 'next/server'
import { UserAuthManager } from '@/lib/user-auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get all users from the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users found to initialize tokens for',
        initializedCount: 0
      })
    }

    let successCount = 0
    let failureCount = 0
    const failures: string[] = []

    // Initialize tokens for each user
    for (const user of users) {
      try {
        const result = await UserAuthManager.initializeTokensForUser(user.id)
        if (result.success) {
          successCount++
        } else {
          failureCount++
          failures.push(`User ${user.id}: ${result.error}`)
        }
      } catch (error) {
        failureCount++
        failures.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch token initialization completed`,
      totalUsers: users.length,
      successCount,
      failureCount,
      failures: failures.length > 0 ? failures : undefined
    })
  } catch (error) {
    console.error('Batch token initialization error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 