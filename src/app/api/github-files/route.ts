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
    const path = searchParams.get('path') || ''
    const branch = searchParams.get('branch') || 'main'
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    
    if (!owner || !repo) {
      return NextResponse.json({
        success: false,
        error: 'Repository owner and name are required'
      }, { status: 400 })
    }
    
    // Fetch files from GitHub repository
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const files = await response.json()
    
    // Filter for prompt-related files and directories
    const promptFiles = Array.isArray(files) ? files.filter(file => {
      const isPromptFile = file.name.match(/\.(yaml|yml|json|ts|tsx|js|jsx|py|md|txt)$/i)
      const isPromptDir = file.type === 'dir' && file.name.match(/(prompt|config|system|template|agent|ai|llm)/i)
      const isCodeWithPrompts = file.name.match(/(prompt|system|agent|ai|llm|chat|conversation)/i)
      return isPromptFile || isPromptDir || isCodeWithPrompts
    }) : []

    return NextResponse.json({
      success: true,
      data: {
        files: promptFiles,
        path,
        total: promptFiles.length
      }
    })

  } catch (error) {
    console.error('GitHub files error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch files'
    }, { status: 500 })
  }
}