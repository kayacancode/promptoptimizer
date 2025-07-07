import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'

export interface UserTokens {
  id: string
  userId: string
  usageTokens: number
  dailyOptimizations: number
  totalOptimizations: number
  lastResetDate: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  createdAt: string
  updatedAt: string
}

export class UserAuthManager {
  private static readonly DAILY_TOKEN_LIMIT = 10 // Beta users get 10 tokens per day

  static async signUp(email: string, password: string): Promise<{
    success: boolean
    error?: string
    user?: any
  }> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Valid email is required' }
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }

    try {
      
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })


      if (error) {
        console.error('Supabase auth error:', error)
        return { success: false, error: error.message }
      }

      if (data.user) {
        
        // Try to create user record - this is the essential part
        try {
          await this.createUserRecord(data.user.id, email)
        } catch (userError) {
          console.error('Failed to create user record:', userError)
          return { success: false, error: `Failed to create user record: ${userError instanceof Error ? userError.message : 'Unknown error'}` }
        }

        // Try to initialize tokens - this is optional and won't fail signup if it doesn't work
        try {
          await this.initializeUserTokensOptional(data.user.id)
        } catch (tokenError) {
          console.warn('Failed to initialize user tokens (this is optional):', tokenError)
          // Don't fail signup if token initialization fails - user can still use the app
        }

        return { success: true, user: data.user }
      }

      return { success: false, error: 'Failed to create user' }
    } catch (error) {
      console.error('SignUp error details:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' }
    }
  }

  static async signIn(email: string, password: string): Promise<{
    success: boolean
    error?: string
    user?: any
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: 'Sign in failed' }
    }
  }

  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Sign out failed' }
    }
  }

  static async getCurrentUser(): Promise<any> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (error) {
      return null
    }
  }

  // Server-side method to get user from request
  static async getCurrentUserFromRequest(request: any): Promise<any> {
    try {
      // Get the authorization header or session cookie
      const authHeader = request.headers.get('authorization')
      const sessionCookie = request.cookies?.get('sb-access-token')?.value || 
                          request.cookies?.get('supabase-auth-token')?.value

      let accessToken = null
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7)
      } else if (sessionCookie) {
        accessToken = sessionCookie
      }

      if (!accessToken) {
        return null
      }

      // Create a server-side Supabase client with the access token
      const { createClient } = await import('@supabase/supabase-js')
      const serverClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        }
      )

      const { data: { user }, error } = await serverClient.auth.getUser(accessToken)
      if (error) {
        console.error('Error getting user from token:', error)
        return null
      }
      
      return user
    } catch (error) {
      console.error('Error in getCurrentUserFromRequest:', error)
      return null
    }
  }

  private static async initializeUserTokens(userId: string, email: string): Promise<void> {
    try {
      
      // Ensure tables exist
      await this.ensureTablesExist()
      
      // Create user record
      await this.createUserRecord(userId, email)
      
      // Initialize user tokens
      await this.initializeUserTokensOptional(userId)
      
    } catch (error) {
      console.error('Error in initializeUserTokens:', error)
      throw error
    }
  }

  private static async createUserRecord(userId: string, email: string): Promise<void> {
    try {
      
      // First ensure the users table exists
      await this.ensureTablesExist()
      
      // Let's check if the table actually exists by testing it first
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      
      if (testError && testError.code === '42P01') {
        throw new Error(`Users table does not exist. Please create it manually by running this SQL in your Supabase dashboard:

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`)
      }
      
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })


      if (userError) {
        console.error('DETAILED ERROR creating user record:', {
          error: userError,
          message: userError?.message || 'No message',
          details: userError?.details || 'No details',
          hint: userError?.hint || 'No hint',
          code: userError?.code || 'No code',
          fullError: JSON.stringify(userError, null, 2),
          errorType: typeof userError,
          errorKeys: Object.keys(userError || {}),
          isEmpty: Object.keys(userError || {}).length === 0
        })
        
        // If the table still doesn't exist, provide helpful guidance
        if (userError.code === '42P01') {
          throw new Error(`Users table does not exist. Please run this SQL in your Supabase dashboard:

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`)
        }
        
        // Handle empty error objects
        if (!userError || Object.keys(userError).length === 0) {
          throw new Error(`Database error saving new user: Empty error object - this usually means the users table doesn't exist or there's a permission issue.`)
        }
        
        // Provide a more detailed error message
        const errorMsg = userError?.message || userError?.details || 'Unknown database error'
        throw new Error(`Database error saving new user: ${errorMsg} (Code: ${userError?.code || 'unknown'})`)
      }

    } catch (error) {
      console.error('Error in createUserRecord:', error)
      throw error
    }
  }

  private static async initializeUserTokensOptional(userId: string): Promise<void> {
    try {
      
      // Check if user_tokens table exists first
      const { data: tableExists, error: checkError } = await supabase
        .from('user_tokens')
        .select('user_id')
        .limit(1)

      if (checkError) {
        // If the table doesn't exist, the error code will be 42P01
        if (checkError.code === '42P01') {
          console.warn('user_tokens table does not exist, skipping token initialization')
          return
        }
        throw checkError
      }

      // Table exists, so initialize tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .upsert({
          user_id: userId,
          usage_tokens: this.DAILY_TOKEN_LIMIT,
          daily_optimizations: 0,
          total_optimizations: 0,
          last_reset_date: new Date().toISOString().split('T')[0],
        })


      if (tokenError) {
        console.error('Error initializing user tokens:', {
          error: tokenError,
          message: tokenError.message,
          details: tokenError.details,
          hint: tokenError.hint,
          code: tokenError.code
        })
        throw new Error(`Database error initializing user tokens: ${tokenError.message}`)
      }

    } catch (error) {
      console.error('Error in initializeUserTokensOptional:', error)
      throw error
    }
  }

  static async getUserTokens(userId: string): Promise<UserTokens | null> {
    try {
      const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // If the table doesn't exist, return null gracefully
        if (error.code === '42P01') {
          console.warn('user_tokens table does not exist')
          return null
        }
        // If no data found for user, return null
        if (error.code === 'PGRST116') {
          console.warn('No tokens found for user:', userId)
          return null
        }
        console.error('Error fetching user tokens:', error)
        return null
      }

      if (!data) {
        return null
      }

      // Check if we need to reset daily tokens
      const today = new Date().toISOString().split('T')[0]
      if (data.last_reset_date !== today) {
        await this.resetDailyTokens(userId)
        // Fetch updated data
        const { data: updatedData, error: updateError } = await supabase
          .from('user_tokens')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (updateError || !updatedData) {
          return null
        }

        return {
          id: updatedData.id,
          userId: updatedData.user_id,
          usageTokens: updatedData.usage_tokens,
          dailyOptimizations: updatedData.daily_optimizations,
          totalOptimizations: updatedData.total_optimizations,
          lastResetDate: updatedData.last_reset_date,
          createdAt: updatedData.created_at,
          updatedAt: updatedData.updated_at,
        }
      }

      return {
        id: data.id,
        userId: data.user_id,
        usageTokens: data.usage_tokens,
        dailyOptimizations: data.daily_optimizations,
        totalOptimizations: data.total_optimizations,
        lastResetDate: data.last_reset_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error)
      return null
    }
  }

  static async useToken(userId: string): Promise<{
    success: boolean
    error?: string
    remainingTokens?: number
  }> {
    try {
      const tokens = await this.getUserTokens(userId)
      if (!tokens) {
        return { 
          success: false, 
          error: 'User tokens not found. Please set up your account tokens first.' 
        }
      }

      if (tokens.usageTokens <= 0) {
        return { success: false, error: 'No tokens remaining for today' }
      }

      const { data, error } = await supabase
        .from('user_tokens')
        .update({
          usage_tokens: tokens.usageTokens - 1,
          daily_optimizations: tokens.dailyOptimizations + 1,
          total_optimizations: tokens.totalOptimizations + 1,
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: 'Failed to update tokens' }
      }

      return { 
        success: true, 
        remainingTokens: data.usage_tokens 
      }
    } catch (error) {
      console.error('Token usage error:', error)
      return { success: false, error: 'Token usage failed' }
    }
  }

  private static async resetDailyTokens(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { error } = await supabase
        .from('user_tokens')
        .update({
          usage_tokens: this.DAILY_TOKEN_LIMIT,
          daily_optimizations: 0,
          last_reset_date: today,
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error resetting daily tokens:', error)
      }
    } catch (error) {
      console.error('Error in resetDailyTokens:', error)
    }
  }

  static async savePrompt(userId: string, promptText: string, responseText: string, modelUsed: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_prompts')
        .insert({
          user_id: userId,
          prompt_text: promptText,
          response_text: responseText,
          model_used: modelUsed
        })

      return !error
    } catch (error) {
      console.error('Error saving prompt:', error)
      return false
    }
  }

  static async getUserPrompts(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_prompts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching user prompts:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserPrompts:', error)
      return []
    }
  }

  static async getUsageStats(): Promise<{
    totalUsers: number
    totalOptimizations: number
    dailyOptimizations: number
  }> {
    try {
      const { data: tokenData, error } = await supabase
        .from('user_tokens')
        .select('daily_optimizations, total_optimizations')

      if (error) {
        console.error('Error fetching usage stats:', error)
        return {
          totalUsers: 0,
          totalOptimizations: 0,
          dailyOptimizations: 0
        }
      }

      const stats = tokenData.reduce((acc, token) => {
        acc.totalUsers++
        acc.totalOptimizations += token.total_optimizations || 0
        acc.dailyOptimizations += token.daily_optimizations || 0
        return acc
      }, {
        totalUsers: 0,
        totalOptimizations: 0,
        dailyOptimizations: 0
      })

      return stats
    } catch (error) {
      console.error('Error in getUsageStats:', error)
      return {
        totalUsers: 0,
        totalOptimizations: 0,
        dailyOptimizations: 0
      }
    }
  }

  // Public method to initialize tokens for a user (can be called after user_tokens table is created)
  static async initializeTokensForUser(userId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await this.initializeUserTokensOptional(userId)
      return { success: true }
    } catch (error) {
      console.error('Error initializing tokens for user:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize tokens'
      }
    }
  }

  // Method to find or create user from GitHub session data
  static async findOrCreateUserFromGitHub(githubEmail: string, githubName?: string): Promise<{
    success: boolean
    userId?: string
    error?: string
  }> {
    try {
      
      // First, try to find existing user by email
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', githubEmail)
        .single()

      if (findError && findError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is fine
        console.error('Error finding user:', findError)
        return { success: false, error: 'Database error finding user' }
      }

      if (existingUser) {
        return { success: true, userId: existingUser.id }
      }

      // User doesn't exist, create a new one
      
      // Generate a user ID (you might want to use GitHub user ID instead)
      const userId = crypto.randomUUID()
      
      try {
        await this.createUserRecord(userId, githubEmail)
        
        // Try to initialize tokens
        try {
          await this.initializeUserTokensOptional(userId)
        } catch (tokenError) {
          console.warn('Failed to initialize tokens for new GitHub user (this is optional):', tokenError)
        }
        
        return { success: true, userId }
        
      } catch (createError) {
        console.error('Failed to create user record for GitHub user:', createError)
        return { 
          success: false, 
          error: `Failed to create user: ${createError instanceof Error ? createError.message : 'Unknown error'}`
        }
      }
      
    } catch (error) {
      console.error('Error in findOrCreateUserFromGitHub:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process GitHub user'
      }
    }
  }

  private static async ensureTablesExist(): Promise<void> {
    try {
      
      // Call our minimal table creation API (just users and user_tokens)
      const response = await fetch('/api/setup/init-minimal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      
      const result = await response.json()
      
      if (result.success) {
      } else {
        console.warn('Essential table creation had issues:', result.error)
        if (result.details) {
          console.warn('Details:', result.details)
        }
        if (result.sqlToRun) {
          console.warn('Manual SQL needed (copy this to Supabase SQL editor):')
          console.warn(result.sqlToRun)
        }
      }
    } catch (error) {
      console.error('Error calling table creation API:', error)
      console.warn('Table creation failed. You may need to create tables manually.')
      // Don't throw error - let the app continue even if table creation fails
    }
  }
}