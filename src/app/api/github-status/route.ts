import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.accessToken) {
      return NextResponse.json({
        success: false,
        data: {
          connected: false,
          error: 'No GitHub authentication found',
          hasApiKey: false
        }
      })
    }

    const searchParams = request.nextUrl.searchParams
    const owner = searchParams.get('owner') || session.user?.name
    const repo = searchParams.get('repo')
    
    if (!owner || !repo) {
      return NextResponse.json({
        success: false,
        data: {
          connected: false,
          error: 'Repository owner and name required',
          hasApiKey: true
        }
      })
    }
    
    // Test GitHub connection by trying to fetch repository info
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    })

    if (response.ok) {
      const repoData = await response.json()
      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          repository: {
            name: repoData.name,
            full_name: repoData.full_name,
            description: repoData.description,
            html_url: repoData.html_url,
            default_branch: repoData.default_branch,
            private: repoData.private
          },
          owner: owner,
          hasApiKey: true
        }
      })
    } else {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

  } catch (error) {
    console.error('GitHub connection error:', error)
    return NextResponse.json({
      success: false,
      data: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        owner: owner || null,
        repo: repo || null,
        hasApiKey: !!session?.accessToken
      }
    })
  }
}