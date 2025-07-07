import { ChangeProposal, GitOperation, FileChange } from '@/types'

export class GitHubIntegration {
  private apiKey: string | undefined
  private owner: string | undefined
  private repo: string | undefined

  constructor(apiKey?: string, owner?: string, repo?: string) {
    this.apiKey = apiKey
    this.owner = owner
    this.repo = repo
  }

  async createPullRequest(proposal: ChangeProposal): Promise<{
    success: boolean
    pullRequestUrl?: string
    pullRequestNumber?: number
    error?: string
  }> {
    try {
      if (!this.validateConfig()) {
        throw new Error('GitHub configuration incomplete. Set GITHUB_API_KEY, GITHUB_OWNER, and GITHUB_REPO')
      }

      // Create a branch for this proposal
      const branchName = `promptloop/optimization-${proposal.id}`
      const branchResult = await this.createBranch(branchName)
      
      if (!branchResult.success) {
        throw new Error(`Failed to create branch: ${branchResult.error}`)
      }

      // Apply changes to the branch
      const changesResult = await this.applyChangesToBranch(branchName, proposal.changes)
      
      if (!changesResult.success) {
        throw new Error(`Failed to apply changes: ${changesResult.error}`)
      }

      // Create the pull request
      const prResult = await this.createPR(proposal, branchName)
      
      return prResult
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private validateConfig(): boolean {
    return !!(this.apiKey && this.owner && this.repo)
  }

  setCredentials(apiKey: string, owner: string, repo: string) {
    this.apiKey = apiKey
    this.owner = owner
    this.repo = repo
  }

  private async createBranch(branchName: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Get the main branch SHA
      const mainBranchResponse = await this.githubFetch(`/repos/${this.owner}/${this.repo}/git/refs/heads/main`)
      
      if (!mainBranchResponse.ok) {
        throw new Error(`Failed to get main branch: ${mainBranchResponse.statusText}`)
      }
      
      const mainBranchData = await mainBranchResponse.json()
      const mainSha = mainBranchData.object.sha

      // Create new branch
      const createBranchResponse = await this.githubFetch(`/repos/${this.owner}/${this.repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: mainSha
        })
      })

      if (!createBranchResponse.ok) {
        const errorData = await createBranchResponse.json()
        throw new Error(`Failed to create branch: ${errorData.message}`)
      }

      return { success: true }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async applyChangesToBranch(branchName: string, changes: FileChange[]): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      for (const change of changes) {
        const result = await this.applyFileChange(branchName, change)
        if (!result.success) {
          throw new Error(`Failed to apply change to ${change.path}: ${result.error}`)
        }
      }

      return { success: true }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async applyFileChange(branchName: string, change: FileChange): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const encodedContent = Buffer.from(change.content || '').toString('base64')
      
      let sha: string | undefined
      
      // Get current file SHA if it exists (for updates)
      if (change.operation === 'update' || change.operation === 'delete') {
        try {
          const fileResponse = await this.githubFetch(
            `/repos/${this.owner}/${this.repo}/contents/${change.path}?ref=${branchName}`
          )
          
          if (fileResponse.ok) {
            const fileData = await fileResponse.json()
            sha = fileData.sha
          }
        } catch {
          // File doesn't exist, which is fine for create operations
        }
      }

      let apiCall
      
      if (change.operation === 'delete') {
        apiCall = this.githubFetch(`/repos/${this.owner}/${this.repo}/contents/${change.path}`, {
          method: 'DELETE',
          body: JSON.stringify({
            message: `Delete ${change.path}: ${change.reason}`,
            sha: sha,
            branch: branchName
          })
        })
      } else {
        // Create or update
        apiCall = this.githubFetch(`/repos/${this.owner}/${this.repo}/contents/${change.path}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: `${change.operation === 'create' ? 'Create' : 'Update'} ${change.path}: ${change.reason}`,
            content: encodedContent,
            branch: branchName,
            ...(sha && { sha })
          })
        })
      }

      const response = await apiCall
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`GitHub API error: ${errorData.message}`)
      }

      return { success: true }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async createPR(proposal: ChangeProposal, branchName: string): Promise<{
    success: boolean
    pullRequestUrl?: string
    pullRequestNumber?: number
    error?: string
  }> {
    try {
      const prBody = this.generatePRBody(proposal)
      
      const response = await this.githubFetch(`/repos/${this.owner}/${this.repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
          title: proposal.title,
          body: prBody,
          head: branchName,
          base: 'main'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to create PR: ${errorData.message}`)
      }

      const prData = await response.json()
      
      return {
        success: true,
        pullRequestUrl: prData.html_url,
        pullRequestNumber: prData.number
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private generatePRBody(proposal: ChangeProposal): string {
    const changesList = proposal.changes.map(change => 
      `- **${change.operation.toUpperCase()}** \`${change.path}\`: ${change.reason}`
    ).join('\n')

    return `## 🤖 Automated Prompt Optimization

${proposal.description}

### Changes Made
${changesList}

### Impact Assessment
- **Impact Level**: ${proposal.impact}
- **Review Status**: ${proposal.reviewStatus}
- **Auto-approve**: ${proposal.autoApprove ? 'Yes' : 'No'}

### Test Results
${proposal.testResults ? 
  proposal.testResults.map(test => 
    `- ${test.status === 'pass' ? '✅' : '❌'} ${test.name} (${test.duration}ms)`
  ).join('\n') : 
  'No test results available'
}

### Reasoning
${proposal.reasoning}

---
*This PR was automatically generated by PromptLoop Agent System*`
  }

  private async githubFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `https://api.github.com${path}`
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  async checkPRStatus(pullRequestNumber: number): Promise<{
    status: 'open' | 'closed' | 'merged'
    reviews: Array<{
      state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'
      reviewer: string
    }>
    checks: Array<{
      name: string
      status: 'success' | 'failure' | 'pending'
      conclusion?: string
    }>
  }> {
    try {
      // Get PR details
      const prResponse = await this.githubFetch(`/repos/${this.owner}/${this.repo}/pulls/${pullRequestNumber}`)
      const prData = await prResponse.json()

      // Get reviews
      const reviewsResponse = await this.githubFetch(`/repos/${this.owner}/${this.repo}/pulls/${pullRequestNumber}/reviews`)
      const reviewsData = await reviewsResponse.json()

      // Get status checks
      const checksResponse = await this.githubFetch(`/repos/${this.owner}/${this.repo}/commits/${prData.head.sha}/check-runs`)
      const checksData = await checksResponse.json()

      return {
        status: prData.merged ? 'merged' : prData.state,
        reviews: reviewsData.map((review: any) => ({
          state: review.state,
          reviewer: review.user.login
        })),
        checks: checksData.check_runs?.map((check: any) => ({
          name: check.name,
          status: check.status,
          conclusion: check.conclusion
        })) || []
      }
    } catch (error) {
      throw new Error(`Failed to check PR status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async mergePR(pullRequestNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const response = await this.githubFetch(`/repos/${this.owner}/${this.repo}/pulls/${pullRequestNumber}/merge`, {
        method: 'PUT',
        body: JSON.stringify({
          merge_method: mergeMethod
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to merge PR: ${errorData.message}`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}