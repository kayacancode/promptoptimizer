import { GetServerSideProps } from 'next'
import { createServerSidePropsClient } from '../../utils/supabase'
import { Database } from '../lib/supabase'

interface DashboardProps {
  user: {
    id: string
    email: string
  }
  userTokens: Database['public']['Tables']['user_tokens']['Row'] | null
}

export default function Dashboard({ user, userTokens }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome to your Dashboard
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                User Information
              </h2>
              <p className="text-blue-700">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-blue-700">
                <strong>User ID:</strong> {user.id}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-900 mb-2">
                Token Usage
              </h2>
              {userTokens ? (
                <div className="text-green-700">
                  <p><strong>Available Tokens:</strong> {userTokens.usage_tokens}</p>
                  <p><strong>Daily Optimizations:</strong> {userTokens.daily_optimizations}</p>
                  <p><strong>Total Optimizations:</strong> {userTokens.total_optimizations}</p>
                  <p><strong>Last Reset:</strong> {userTokens.last_reset_date}</p>
                </div>
              ) : (
                <p className="text-green-700">Loading token information...</p>
              )}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              🔒 Protected Content
            </h2>
            <p className="text-yellow-700">
              This page is only accessible to authenticated users. If you can see this, 
              your authentication is working correctly!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = createServerSidePropsClient()
  
  // Get the session from the request cookies
  const { req } = context
  const accessToken = req.cookies['sb-access-token']
  const refreshToken = req.cookies['sb-refresh-token']
  
  if (!accessToken && !refreshToken) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }
  
  try {
    // Set the session if we have tokens
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    }
    
    // Use getUser() to properly validate the auth token
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