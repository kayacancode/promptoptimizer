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

    const searchParams = request.nextUrl.searchParams
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    
    if (!owner || !repo) {
      return NextResponse.json({
        success: false,
        error: 'Repository owner and name are required'
      }, { status: 400 })
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    })

    if (response.ok) {
      const branches = await response.json()
      return NextResponse.json({
        success: true,
        data: {
          branches: branches.map((branch: any) => ({
            name: branch.name,
            commit: {
              sha: branch.commit.sha,
              url: branch.commit.url
            },
            protected: branch.protected
          }))
        }
      })
    } else {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

  } catch (error) {
    console.error('GitHub branches error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}