import { GetServerSideProps } from 'next'
import { createServerClient } from '@supabase/ssr'
import { Database } from '../lib/supabase'
import { PromptOptimizationFlow } from '@/components/PromptOptimizationFlow'
import { useState } from 'react'
import { User, Settings, LogOut, Zap, BarChart3, History } from 'lucide-react'

interface DashboardProps {
  user: {
    id: string
    email: string
  }
  userTokens: Database['public']['Tables']['user_tokens']['Row'] | null
}

export default function Dashboard({ user, userTokens }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('optimize')

  const handleSignOut = async () => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'signout' }),
    })
    
    if (response.ok) {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                bestmate
              </h1>
            </div>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setActiveTab('optimize')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'optimize'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Optimize</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Token Balance */}
              {userTokens && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{userTokens.usage_tokens || 0} tokens</span>
                </div>
              )}
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{user.email}</p>
                </div>
              </div>

              {/* Settings & Sign Out */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center space-x-3 mb-4">
              
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Welcome back!</h2>
                  <p className="text-slate-600">Transform your prompts with AI-powered optimization</p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="border-2 border-black rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Available Tokens</p>
                      <p className="text-lg font-semibold text-slate-900">{userTokens?.usage_tokens || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-2 border-black rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Optimizations</p>
                      <p className="text-lg font-semibold text-slate-900">0</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-2 border-black  rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <History className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Success Rate</p>
                      <p className="text-lg font-semibold text-slate-900">--%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Optimization Flow */}
            <PromptOptimizationFlow />
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

        {activeTab === 'history' && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-200">
            <div className="text-center">
              <History className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Optimization History</h3>
              <p className="text-slate-600">Your previous optimizations will appear here.</p>
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