import { v4 as uuidv4 } from 'uuid'

export interface AccessKey {
  key: string
  email?: string
  tier: 'trial' | 'premium' | 'unlimited'
  optimizationsUsed: number
  dailyLimit: number
  createdAt: string
  lastUsed: string
  isActive: boolean
}

export interface KeyUsage {
  optimizationsToday: number
  lastResetDate: string
}

import fs from 'fs'
import path from 'path'

// File-based storage for demo (replace with database later)
const STORAGE_DIR = path.join(process.cwd(), '.promptloop-data')
const KEYS_FILE = path.join(STORAGE_DIR, 'access-keys.json')
const USAGE_FILE = path.join(STORAGE_DIR, 'key-usage.json')

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

function loadAccessKeys(): Map<string, AccessKey> {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, 'utf8')
      const parsed = JSON.parse(data)
      return new Map(Object.entries(parsed))
    }
  } catch (error) {
    console.error('Error loading access keys:', error)
  }
  return new Map()
}

function saveAccessKeys(keys: Map<string, AccessKey>) {
  try {
    const data = JSON.stringify(Object.fromEntries(keys), null, 2)
    fs.writeFileSync(KEYS_FILE, data, 'utf8')
  } catch (error) {
    console.error('Error saving access keys:', error)
  }
}

function loadKeyUsage(): Map<string, KeyUsage> {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      const data = fs.readFileSync(USAGE_FILE, 'utf8')
      const parsed = JSON.parse(data)
      return new Map(Object.entries(parsed))
    }
  } catch (error) {
    console.error('Error loading key usage:', error)
  }
  return new Map()
}

function saveKeyUsage(usage: Map<string, KeyUsage>) {
  try {
    const data = JSON.stringify(Object.fromEntries(usage), null, 2)
    fs.writeFileSync(USAGE_FILE, data, 'utf8')
  } catch (error) {
    console.error('Error saving key usage:', error)
  }
}

export class AccessKeyManager {
  
  static generateKey(): string {
    const prefix = 'pl_'
    const id = uuidv4().replace(/-/g, '').substring(0, 24)
    return prefix + id
  }

  static async createAccessKey(
    email?: string, 
    tier: 'trial' | 'premium' | 'unlimited' = 'trial'
  ): Promise<AccessKey> {
    const key = this.generateKey()
    
    const limits = {
      trial: 3,
      premium: 50,
      unlimited: 999999
    }
    
    const accessKey: AccessKey = {
      key,
      email,
      tier,
      optimizationsUsed: 0,
      dailyLimit: limits[tier],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      isActive: true
    }
    
    const accessKeys = loadAccessKeys()
    const keyUsage = loadKeyUsage()
    
    accessKeys.set(key, accessKey)
    keyUsage.set(key, {
      optimizationsToday: 0,
      lastResetDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    })
    
    saveAccessKeys(accessKeys)
    saveKeyUsage(keyUsage)
    
    return accessKey
  }

  static async validateKey(key: string): Promise<{
    valid: boolean
    accessKey?: AccessKey
    usage?: KeyUsage
    error?: string
  }> {
    if (!key || !key.startsWith('pl_')) {
      return { valid: false, error: 'Invalid key format' }
    }

    const accessKeys = loadAccessKeys()
    const keyUsage = loadKeyUsage()

    const accessKey = accessKeys.get(key)
    if (!accessKey) {
      return { valid: false, error: 'Key not found' }
    }

    if (!accessKey.isActive) {
      return { valid: false, error: 'Key has been deactivated' }
    }

    let usage = keyUsage.get(key)
    if (!usage) {
      usage = {
        optimizationsToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      }
      keyUsage.set(key, usage)
      saveKeyUsage(keyUsage)
    }

    // Reset daily usage if it's a new day
    const today = new Date().toISOString().split('T')[0]
    if (usage.lastResetDate !== today) {
      usage.optimizationsToday = 0
      usage.lastResetDate = today
      keyUsage.set(key, usage)
      saveKeyUsage(keyUsage)
    }

    return { valid: true, accessKey, usage }
  }

  static async useOptimization(key: string): Promise<{
    success: boolean
    remaining: number
    error?: string
  }> {
    const validation = await this.validateKey(key)
    if (!validation.valid) {
      return { success: false, remaining: 0, error: validation.error }
    }

    const { accessKey, usage } = validation
    
    if (usage!.optimizationsToday >= accessKey!.dailyLimit) {
      return { 
        success: false, 
        remaining: 0, 
        error: `Daily limit of ${accessKey!.dailyLimit} optimizations reached. Upgrade for more!` 
      }
    }

    const accessKeys = loadAccessKeys()
    const keyUsage = loadKeyUsage()

    // Increment usage
    usage!.optimizationsToday += 1
    accessKey!.optimizationsUsed += 1
    accessKey!.lastUsed = new Date().toISOString()
    
    keyUsage.set(key, usage!)
    accessKeys.set(key, accessKey!)

    saveKeyUsage(keyUsage)
    saveAccessKeys(accessKeys)

    const remaining = accessKey!.dailyLimit - usage!.optimizationsToday

    return { success: true, remaining }
  }

  static async getKeyInfo(key: string): Promise<{
    valid: boolean
    info?: {
      tier: string
      dailyLimit: number
      optimizationsToday: number
      remaining: number
      totalUsed: number
      createdAt: string
    }
    error?: string
  }> {
    const validation = await this.validateKey(key)
    if (!validation.valid) {
      return { valid: false, error: validation.error }
    }

    const { accessKey, usage } = validation

    return {
      valid: true,
      info: {
        tier: accessKey!.tier,
        dailyLimit: accessKey!.dailyLimit,
        optimizationsToday: usage!.optimizationsToday,
        remaining: accessKey!.dailyLimit - usage!.optimizationsToday,
        totalUsed: accessKey!.optimizationsUsed,
        createdAt: accessKey!.createdAt
      }
    }
  }

  static async upgradeKey(key: string, newTier: 'premium' | 'unlimited'): Promise<{
    success: boolean
    error?: string
  }> {
    const accessKeys = loadAccessKeys()
    const accessKey = accessKeys.get(key)
    if (!accessKey) {
      return { success: false, error: 'Key not found' }
    }

    const limits = {
      premium: 50,
      unlimited: 999999
    }

    accessKey.tier = newTier
    accessKey.dailyLimit = limits[newTier]
    accessKeys.set(key, accessKey)
    saveAccessKeys(accessKeys)

    return { success: true }
  }

  static async deactivateKey(key: string): Promise<boolean> {
    const accessKeys = loadAccessKeys()
    const accessKey = accessKeys.get(key)
    if (!accessKey) return false

    accessKey.isActive = false
    accessKeys.set(key, accessKey)
    saveAccessKeys(accessKeys)
    return true
  }

  // Admin functions
  static getAllKeys(): AccessKey[] {
    const accessKeys = loadAccessKeys()
    return Array.from(accessKeys.values())
  }

  static getKeyStats(): {
    totalKeys: number
    activeKeys: number
    trialKeys: number
    premiumKeys: number
    unlimitedKeys: number
    totalOptimizations: number
  } {
    const accessKeys = loadAccessKeys()
    const keys = Array.from(accessKeys.values())
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      trialKeys: keys.filter(k => k.tier === 'trial').length,
      premiumKeys: keys.filter(k => k.tier === 'premium').length,
      unlimitedKeys: keys.filter(k => k.tier === 'unlimited').length,
      totalOptimizations: keys.reduce((sum, k) => sum + k.optimizationsUsed, 0)
    }
  }
}

export const accessKeyManager = AccessKeyManager