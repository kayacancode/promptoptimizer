import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path') || ''
    const branch = searchParams.get('branch') || 'main'
    
    // Fetch files from GitHub repository
    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_API_KEY}`,
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