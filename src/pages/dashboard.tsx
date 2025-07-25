import { GetServerSideProps } from 'next'
import { createServerClient } from '@supabase/ssr'
import { Database } from '../lib/supabase'
import { PromptOptimizationFlow } from '@/components/PromptOptimizationFlow'
import { OptimizationHistory } from '@/components/OptimizationHistory'
import { BestMateKeyManager } from '@/components/BestMateKeyManager'
import { useState } from 'react'
import { User, Settings, LogOut, Zap, BarChart3, History, Key } from 'lucide-react'

interface DashboardProps {
  user: {
    id: string
    email: string
  }
  userTokens: Database['public']['Tables']['user_tokens']['Row'] | null
}

export default function Dashboard({ user, userTokens }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('optimize')
  const [dashboardMetrics, setDashboardMetrics] = useState({
    availableTokens: userTokens?.usage_tokens || 0,
    optimizationCount: 0,
    successRate: 0
  })

  // Function to update metrics in database
  const updateMetricsInDatabase = async (newMetrics: typeof dashboardMetrics) => {
    try {
      const response = await fetch('/api/user/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          optimizationCount: newMetrics.optimizationCount,
          successRate: newMetrics.successRate,
          availableTokens: newMetrics.availableTokens
        })
      })
      
      if (!response.ok) {
        console.error('Failed to update metrics in database')
      }
    } catch (error) {
      console.error('Error updating metrics:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        window.location.href = '/'
      } else {
        console.error('Sign out failed')
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#1d1d1f]">
      {/* Header */}
      <div className="bg-[#1d1d1f] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              
              <h1 className="text-xl font-bold text-white">
                bestmate
              </h1>
            </div>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setActiveTab('optimize')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'optimize'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Optimize</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'api-keys'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>API Keys</span>
              </button>
              {/* <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button> */}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Token Balance */}
              {userTokens && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-800 text-white rounded-full text-sm">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="font-medium">{userTokens.usage_tokens || 0} tokens</span>
                </div>
              )}
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">{user.email}</p>
                </div>
              </div>

              {/* Settings & Sign Out */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'optimize' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
              
                <div>
                  <h2 className="text-xl font-semibold text-white">Welcome back!</h2>
                  <p className="text-gray-400">Transform your prompts with AI-powered optimization</p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Available Tokens</p>
                      <p className="text-lg font-semibold text-white">{dashboardMetrics.availableTokens}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Optimizations</p>
                      <p className="text-lg font-semibold text-white">{dashboardMetrics.optimizationCount}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <History className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Success Rate</p>
                      <p className="text-lg font-semibold text-white">{dashboardMetrics.successRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Optimization Flow */}
            <PromptOptimizationFlow 
              onOptimizationComplete={(success: boolean) => {
                const newMetrics = {
                  ...dashboardMetrics,
                  optimizationCount: dashboardMetrics.optimizationCount + 1,
                  successRate: Math.round(((dashboardMetrics.successRate * (dashboardMetrics.optimizationCount / 100)) + (success ? 1 : 0)) / ((dashboardMetrics.optimizationCount + 1) / 100)),
                  availableTokens: dashboardMetrics.availableTokens - 1 // Subtract 1 token
                }
                
                setDashboardMetrics(newMetrics)
                updateMetricsInDatabase(newMetrics)
                
                // Update token balance without refreshing the page
                // The token balance will be updated through the metrics system
              }}
            />
          </div>
        )}


        {activeTab === 'history' && (
          <OptimizationHistory userId={user.id} />
        )}

        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-2">API Key Management</h2>
              <p className="text-gray-400 mb-6">
                Manage your BestMate API keys for use with the MCP server in Cursor IDE.
              </p>
              <BestMateKeyManager />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-200">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics Dashboard</h3>
              <p className="text-slate-600">Analytics and insights will be available here soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => context.req.cookies[name],
      },
    }
  )
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      }
    }
    
    // Fetch user tokens data
    const { data: userTokens, error: tokensError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (tokensError) {
      console.error('Error fetching user tokens:', tokensError)
    }
    
    return {
      props: {
        user: {
          id: user.id,
          email: user.email || '',
        },
        userTokens: userTokens || null,
      },
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }
}