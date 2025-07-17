import { GetServerSideProps } from 'next'
import { createServerClient } from '@supabase/ssr'
import { Database } from '../lib/supabase'
import { PromptOptimizationFlow } from '@/components/PromptOptimizationFlow'

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
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Prompt Optimization Engine
        </h1>
        <PromptOptimizationFlow />
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