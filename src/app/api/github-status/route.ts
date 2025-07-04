import { NextRequest, NextResponse } from 'next/server'
import { GitHubIntegration } from '@/lib/github-integration'

export async function GET() {
  try {
    const github = new GitHubIntegration()
    
    // Test GitHub connection by trying to fetch repository info
    const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_API_KEY}`,
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
          owner: process.env.GITHUB_OWNER,
          hasApiKey: !!process.env.GITHUB_API_KEY
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
        owner: process.env.GITHUB_OWNER || null,
        repo: process.env.GITHUB_REPO || null,
        hasApiKey: !!process.env.GITHUB_API_KEY
      }
    })
  }
}