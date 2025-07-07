import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import NextAuth from "next-auth"
import GitHubProvider from "next-auth/providers/github"

const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo user:email"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }: any) {
      (session as any).accessToken = token.accessToken
      return session
    }
  }
}

interface SessionWithAccessToken {
  accessToken?: string
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as SessionWithAccessToken
    
    if (!session?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No GitHub authentication found'
      }, { status: 401 })
    }

    // Fetch user's repositories
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const repos = await response.json()
    
    // Filter and format repositories
    const formattedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      default_branch: repo.default_branch,
      private: repo.private,
      updated_at: repo.updated_at,
      language: repo.language,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        repositories: formattedRepos,
        total: formattedRepos.length
      }
    })

  } catch (error) {
    console.error('GitHub repositories error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch repositories'
    }, { status: 500 })
  }
} 