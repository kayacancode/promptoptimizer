import { supabaseAdmin, supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export interface AccessKey {
  id: string
  userId: string
  key: string
  tier: 'trial' | 'premium' | 'unlimited'
  dailyLimit: number
  dailyUsage: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  createdAt: string
  updatedAt: string
}

export class SupabaseAccessKeyManager {
  private static generateAccessKey(): string {
    return `pl_${uuidv4().replace(/-/g, '').substring(0, 24)}`
  }

  static async createAccessKey(email: string, tier: 'trial' | 'premium' | 'unlimited' = 'trial'): Promise<AccessKey> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Valid email is required')
    }

    let user: any = null

    // Skip user lookup for now - just create a user directly
    try {
      // Create user directly without checking if exists
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({ email })
        .select()
        .single()

      if (createError) {
        // If user already exists, try to get them
        if (createError.code === '23505') { // unique constraint violation
          const { data: existingUser, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single()
          
          if (fetchError) {
            throw new Error(`Failed to fetch existing user: ${fetchError.message}`)
          }
          user = existingUser
        } else {
          throw new Error(`Failed to create user: ${createError.message}`)
        }
      } else {
        user = newUser
      }
    } catch (error) {
      console.error('Error with user operations:', error)
      throw new Error(`Database error: ${error}`)
    }

    if (!user) {
      throw new Error('Failed to create or find user')
    }

    // Generate access key
    const accessKey = this.generateAccessKey()
    
    // Set daily limits based on tier
    const dailyLimits = {
      trial: 5,
      premium: 50,
      unlimited: 999999
    }

    // Insert access key
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('access_keys')
      .insert({
        user_id: user.id,
        key: accessKey,
        tier,
        daily_limit: dailyLimits[tier],
        daily_usage: 0,
        is_active: true
      })
      .select()
      .single()

    if (keyError) {
      throw new Error(`Failed to create access key: ${keyError.message}`)
    }

    return {
      id: keyData.id,
      userId: keyData.user_id,
      key: keyData.key,
      tier: keyData.tier,
      dailyLimit: keyData.daily_limit,
      dailyUsage: keyData.daily_usage,
      isActive: keyData.is_active,
      createdAt: keyData.created_at,
      updatedAt: keyData.updated_at
    }
  }

  static async getKeyInfo(key: string): Promise<{
    valid: boolean
    error?: string
    info?: AccessKey & { email: string }
  }> {
    if (!key || !key.startsWith('pl_')) {
      return { valid: false, error: 'Invalid key format' }
    }

    try {
      const { data: keyData, error: keyError } = await supabaseAdmin
        .from('access_keys')
        .select(`
          *,
          users (email)
        `)
        .eq('key', key)
        .eq('is_active', true)
        .single()

      if (keyError || !keyData) {
        return { valid: false, error: 'Key not found' }
      }

      return {
        valid: true,
        info: {
          id: keyData.id,
          userId: keyData.user_id,
          key: keyData.key,
          tier: keyData.tier,
          dailyLimit: keyData.daily_limit,
          dailyUsage: keyData.daily_usage,
          isActive: keyData.is_active,
          createdAt: keyData.created_at,
          updatedAt: keyData.updated_at,
          email: keyData.users.email
        }
      }
    } catch (error) {
      return { valid: false, error: 'Database error' }
    }
  }

  static async incrementUsage(key: string): Promise<boolean> {
    try {
      const { data: keyData, error: fetchError } = await supabaseAdmin
        .from('access_keys')
        .select('daily_usage, daily_limit')
        .eq('key', key)
        .eq('is_active', true)
        .single()

      if (fetchError || !keyData) {
        return false
      }

      if (keyData.daily_usage >= keyData.daily_limit) {
        return false // Daily limit exceeded
      }

      const { error: updateError } = await supabaseAdmin
        .from('access_keys')
        .update({ daily_usage: keyData.daily_usage + 1 })
        .eq('key', key)

      return !updateError
    } catch (error) {
      return false
    }
  }

  static async upgradeKey(key: string, newTier: 'premium' | 'unlimited'): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const limits = {
        premium: 50,
        unlimited: 999999
      }

      const { error } = await supabaseAdmin
        .from('access_keys')
        .update({
          tier: newTier,
          daily_limit: limits[newTier]
        })
        .eq('key', key)
        .eq('is_active', true)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Database error' }
    }
  }

  static async deactivateKey(key: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('access_keys')
        .update({ is_active: false })
        .eq('key', key)

      return !error
    } catch (error) {
      return false
    }
  }

  static async getUserKeys(email: string): Promise<AccessKey[]> {
    try {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        return []
      }

      const { data: keysData, error: keysError } = await supabaseAdmin
        .from('access_keys')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })

      if (keysError) {
        return []
      }

      return keysData.map(key => ({
        id: key.id,
        userId: key.user_id,
        key: key.key,
        tier: key.tier,
        dailyLimit: key.daily_limit,
        dailyUsage: key.daily_usage,
        isActive: key.is_active,
        createdAt: key.created_at,
        updatedAt: key.updated_at
      }))
    } catch (error) {
      return []
    }
  }

  static async savePrompt(userId: string, promptText: string, responseText: string, modelUsed: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('user_prompts')
        .insert({
          user_id: userId,
          prompt_text: promptText,
          response_text: responseText,
          model_used: modelUsed
        })

      return !error
    } catch (error) {
      return false
    }
  }

  static async saveSession(userId: string, sessionData: any): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .upsert({
          user_id: userId,
          session_data: sessionData
        })

      return !error
    } catch (error) {
      return false
    }
  }

  static async getAllKeys(): Promise<AccessKey[]> {
    try {
      const { data: keysData, error } = await supabase
        .from('access_keys')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all keys:', error)
        return []
      }

      return keysData.map(key => ({
        id: key.id,
        userId: key.user_id,
        key: key.key,
        tier: key.tier,
        dailyLimit: key.daily_limit,
        dailyUsage: key.daily_usage,
        isActive: key.is_active,
        createdAt: key.created_at,
        updatedAt: key.updated_at
      }))
    } catch (error) {
      console.error('Error in getAllKeys:', error)
      return []
    }
  }

  static async getKeyStats(): Promise<{
    totalKeys: number
    activeKeys: number
    trialKeys: number
    premiumKeys: number
    unlimitedKeys: number
    totalOptimizations: number
  }> {
    try {
      const { data: keysData, error } = await supabase
        .from('access_keys')
        .select('tier, daily_usage, is_active')

      if (error) {
        console.error('Error fetching key stats:', error)
        return {
          totalKeys: 0,
          activeKeys: 0,
          trialKeys: 0,
          premiumKeys: 0,
          unlimitedKeys: 0,
          totalOptimizations: 0
        }
      }

      const stats = keysData.reduce((acc, key) => {
        acc.totalKeys++
        if (key.is_active) acc.activeKeys++
        if (key.tier === 'trial') acc.trialKeys++
        if (key.tier === 'premium') acc.premiumKeys++
        if (key.tier === 'unlimited') acc.unlimitedKeys++
        acc.totalOptimizations += key.daily_usage || 0
        return acc
      }, {
        totalKeys: 0,
        activeKeys: 0,
        trialKeys: 0,
        premiumKeys: 0,
        unlimitedKeys: 0,
        totalOptimizations: 0
      })

      return stats
    } catch (error) {
      console.error('Error in getKeyStats:', error)
      return {
        totalKeys: 0,
        activeKeys: 0,
        trialKeys: 0,
        premiumKeys: 0,
        unlimitedKeys: 0,
        totalOptimizations: 0
      }
    }
  }
}