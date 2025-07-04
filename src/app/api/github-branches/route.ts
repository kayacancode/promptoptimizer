import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/branches`, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_API_KEY}`,
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