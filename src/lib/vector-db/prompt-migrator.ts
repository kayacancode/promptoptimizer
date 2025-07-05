import { PineconeClient, VectorPrompt } from './pinecone-client'
import { ExtractedPrompt } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export interface PromptMigrationConfig {
  userId: string
  domain?: string
  language?: string
  framework?: string
  complexity?: 'low' | 'medium' | 'high'
  tags?: string[]
}

export class PromptMigrator {
  private pineconeClient: PineconeClient

  constructor() {
    this.pineconeClient = new PineconeClient()
  }

  async migrateExtractedPrompts(
    extractedPrompts: ExtractedPrompt[],
    config: PromptMigrationConfig
  ): Promise<void> {
    const vectorPrompts: VectorPrompt[] = extractedPrompts.map(prompt => ({
      id: prompt.id || uuidv4(),
      userId: config.userId,
      content: prompt.content,
      title: this.generateTitle(prompt.content),
      type: prompt.type,
      metadata: {
        domain: config.domain,
        language: config.language,
        framework: config.framework,
        complexity: config.complexity || this.inferComplexity(prompt.content),
        tags: config.tags || this.generateTags(prompt.content),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }))

    await this.pineconeClient.batchUpsertPrompts(vectorPrompts)
  }

  async migratePromptContent(
    content: string,
    config: PromptMigrationConfig,
    type: 'system_prompt' | 'user_prompt' | 'template' | 'instruction' = 'user_prompt'
  ): Promise<string> {
    const promptId = uuidv4()
    const vectorPrompt: VectorPrompt = {
      id: promptId,
      userId: config.userId,
      content,
      title: this.generateTitle(content),
      type,
      metadata: {
        domain: config.domain || this.inferDomain(content),
        language: config.language || this.inferLanguage(content),
        framework: config.framework || this.inferFramework(content),
        complexity: config.complexity || this.inferComplexity(content),
        tags: config.tags || this.generateTags(content),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    await this.pineconeClient.upsertPrompt(vectorPrompt)
    return promptId
  }

  private generateTitle(content: string): string {
    // Extract first meaningful sentence or first 50 characters
    const sentences = content.split(/[.!?]+/)
    if (sentences.length > 0 && sentences[0].trim().length > 0) {
      return sentences[0].trim().substring(0, 50) + (sentences[0].length > 50 ? '...' : '')
    }
    return content.substring(0, 50) + (content.length > 50 ? '...' : '')
  }

  private inferDomain(content: string): string {
    const domainKeywords = {
      'software-development': ['code', 'programming', 'software', 'development', 'bug', 'debug', 'function', 'class', 'variable'],
      'data-analysis': ['data', 'analysis', 'dataset', 'statistics', 'visualization', 'chart', 'graph', 'metrics'],
      'content-creation': ['write', 'create', 'generate', 'content', 'blog', 'article', 'story', 'essay'],
      'customer-support': ['help', 'support', 'customer', 'issue', 'problem', 'assistance', 'resolve'],
      'education': ['learn', 'teach', 'explain', 'understand', 'concept', 'lesson', 'tutorial'],
      'business': ['business', 'strategy', 'marketing', 'sales', 'revenue', 'profit', 'growth'],
      'research': ['research', 'study', 'investigate', 'analyze', 'findings', 'hypothesis', 'experiment']
    }

    const lowerContent = content.toLowerCase()
    let maxScore = 0
    let bestDomain = 'general'

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowerContent.includes(keyword) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestDomain = domain
      }
    }

    return bestDomain
  }

  private inferLanguage(content: string): string {
    const languageKeywords = {
      'python': ['python', 'pip', 'django', 'flask', 'pandas', 'numpy', 'def ', 'import ', 'from '],
      'javascript': ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'function', 'const ', 'let ', 'var '],
      'typescript': ['typescript', 'ts', 'interface', 'type ', 'enum', 'namespace'],
      'java': ['java', 'class', 'public static', 'void main', 'spring', 'maven'],
      'csharp': ['c#', 'csharp', 'dotnet', '.net', 'class', 'namespace', 'using System'],
      'sql': ['sql', 'select', 'insert', 'update', 'delete', 'from', 'where', 'join'],
      'html': ['html', 'div', 'span', 'class=', 'id=', '<html', '<body'],
      'css': ['css', 'style', 'color:', 'margin:', 'padding:', 'display:', 'font-']
    }

    const lowerContent = content.toLowerCase()
    let maxScore = 0
    let bestLanguage = 'general'

    for (const [language, keywords] of Object.entries(languageKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowerContent.includes(keyword) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestLanguage = language
      }
    }

    return bestLanguage
  }

  private inferFramework(content: string): string {
    const frameworkKeywords = {
      'react': ['react', 'jsx', 'useState', 'useEffect', 'component', 'props'],
      'vue': ['vue', 'v-if', 'v-for', 'v-model', 'computed', 'methods'],
      'angular': ['angular', 'component', 'service', 'module', 'directive', 'ng-'],
      'django': ['django', 'models.py', 'views.py', 'urls.py', 'template'],
      'flask': ['flask', 'app.route', 'render_template', 'request', 'session'],
      'express': ['express', 'app.get', 'app.post', 'middleware', 'router'],
      'spring': ['spring', 'springboot', '@Controller', '@Service', '@Repository'],
      'nextjs': ['nextjs', 'next.js', 'getStaticProps', 'getServerSideProps', 'pages/'],
      'nuxt': ['nuxt', 'nuxt.js', 'asyncData', 'fetch', 'layouts/']
    }

    const lowerContent = content.toLowerCase()
    let maxScore = 0
    let bestFramework = 'none'

    for (const [framework, keywords] of Object.entries(frameworkKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowerContent.includes(keyword) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestFramework = framework
      }
    }

    return bestFramework
  }

  private inferComplexity(content: string): 'low' | 'medium' | 'high' {
    const wordCount = content.split(/\s+/).length
    const sentenceCount = content.split(/[.!?]+/).length
    const hasCode = /```|`[^`]+`|\bcode\b|\bfunction\b|\bclass\b/.test(content)
    const hasMultipleSteps = /\b(step|first|second|third|then|next|finally)\b/gi.test(content)

    let complexityScore = 0

    if (wordCount > 100) complexityScore += 1
    if (wordCount > 300) complexityScore += 1
    if (sentenceCount > 5) complexityScore += 1
    if (hasCode) complexityScore += 1
    if (hasMultipleSteps) complexityScore += 1

    if (complexityScore >= 3) return 'high'
    if (complexityScore >= 1) return 'medium'
    return 'low'
  }

  private generateTags(content: string): string[] {
    const tags: string[] = []
    const lowerContent = content.toLowerCase()

    // Domain-specific tags
    if (lowerContent.includes('optimize') || lowerContent.includes('improve')) tags.push('optimization')
    if (lowerContent.includes('debug') || lowerContent.includes('error')) tags.push('debugging')
    if (lowerContent.includes('test') || lowerContent.includes('testing')) tags.push('testing')
    if (lowerContent.includes('api') || lowerContent.includes('endpoint')) tags.push('api')
    if (lowerContent.includes('database') || lowerContent.includes('sql')) tags.push('database')
    if (lowerContent.includes('security') || lowerContent.includes('auth')) tags.push('security')
    if (lowerContent.includes('performance') || lowerContent.includes('speed')) tags.push('performance')
    if (lowerContent.includes('ui') || lowerContent.includes('interface')) tags.push('ui')
    if (lowerContent.includes('deploy') || lowerContent.includes('deployment')) tags.push('deployment')
    if (lowerContent.includes('config') || lowerContent.includes('setting')) tags.push('configuration')

    // Complexity tags
    if (content.split(/\s+/).length > 200) tags.push('complex')
    if (content.includes('```')) tags.push('code-example')
    if (/\b(step|first|second|third|then|next|finally)\b/gi.test(content)) tags.push('multi-step')

    return tags.slice(0, 5) // Limit to 5 tags
  }

  async initializeVectorDatabase(): Promise<void> {
    await this.pineconeClient.initializeIndex()
  }
}

export const promptMigrator = new PromptMigrator()