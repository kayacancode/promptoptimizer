import { ConfigFile, ExtractedPrompt } from '@/types'

export interface CodeContext {
  prompt: ExtractedPrompt
  surroundingCode: {
    before: string[]
    after: string[]
  }
  relatedFunctions: FunctionContext[]
  imports: string[]
  variables: VariableContext[]
  usage: UsageContext[]
}

interface FunctionContext {
  name: string
  parameters: string[]
  returnType?: string
  description?: string
}

interface VariableContext {
  name: string
  type?: string
  value?: string
  isConstant: boolean
}

interface UsageContext {
  location: string
  lineNumber: number
  context: string
}

export class ContextAnalyzer {
  private static readonly CONTEXT_LINES = 10 // Lines before/after prompt to capture

  /**
   * Analyze the context around extracted prompts to provide better optimization insights
   */
  static analyzePromptContext(configFile: ConfigFile): CodeContext[] {
    if (!configFile.extractedPrompts || configFile.extractedPrompts.length === 0) {
      return []
    }

    const lines = configFile.content.split('\n')
    const contexts: CodeContext[] = []

    for (const prompt of configFile.extractedPrompts) {
      const context = this.extractContext(prompt, lines, configFile)
      contexts.push(context)
    }

    return contexts
  }

  private static extractContext(
    prompt: ExtractedPrompt, 
    lines: string[], 
    configFile: ConfigFile
  ): CodeContext {
    const promptLine = prompt.lineNumber - 1 // Convert to 0-based index
    
    // Get surrounding code
    const startLine = Math.max(0, promptLine - this.CONTEXT_LINES)
    const endLine = Math.min(lines.length - 1, promptLine + this.CONTEXT_LINES)
    
    const before = lines.slice(startLine, promptLine)
    const after = lines.slice(promptLine + 1, endLine + 1)

    // Extract imports
    const imports = this.extractImports(lines)

    // Extract related functions
    const relatedFunctions = this.extractRelatedFunctions(lines, promptLine)

    // Extract variables in scope
    const variables = this.extractVariables(lines, promptLine)

    // Find where this prompt is used
    const usage = this.findPromptUsage(prompt, lines, configFile)

    return {
      prompt,
      surroundingCode: { before, after },
      relatedFunctions,
      imports,
      variables,
      usage
    }
  }

  private static extractImports(lines: string[]): string[] {
    const imports: string[] = []
    
    for (const line of lines) {
      // Python imports
      if (line.match(/^(import|from)\s+[\w.]+/)) {
        imports.push(line.trim())
      }
      // JavaScript/TypeScript imports
      else if (line.match(/^import\s+.*from\s+['"`]/)) {
        imports.push(line.trim())
      }
      // CommonJS requires
      else if (line.match(/const\s+\w+\s*=\s*require\(/)) {
        imports.push(line.trim())
      }
    }

    return imports
  }

  private static extractRelatedFunctions(lines: string[], promptLine: number): FunctionContext[] {
    const functions: FunctionContext[] = []
    
    // Look for function definitions near the prompt
    const searchRange = 20 // Lines to search before/after
    const startSearch = Math.max(0, promptLine - searchRange)
    const endSearch = Math.min(lines.length - 1, promptLine + searchRange)

    for (let i = startSearch; i <= endSearch; i++) {
      const line = lines[i]
      
      // Python function
      const pyMatch = line.match(/def\s+(\w+)\s*\((.*?)\)/)
      if (pyMatch) {
        functions.push({
          name: pyMatch[1],
          parameters: pyMatch[2].split(',').map(p => p.trim()).filter(p => p)
        })
      }

      // JavaScript/TypeScript function
      const jsMatch = line.match(/(?:async\s+)?function\s+(\w+)\s*\((.*?)\)/)
      if (jsMatch) {
        functions.push({
          name: jsMatch[1],
          parameters: jsMatch[2].split(',').map(p => p.trim()).filter(p => p)
        })
      }

      // Arrow functions
      const arrowMatch = line.match(/const\s+(\w+)\s*=\s*(?:async\s+)?\((.*?)\)\s*=>/)
      if (arrowMatch) {
        functions.push({
          name: arrowMatch[1],
          parameters: arrowMatch[2].split(',').map(p => p.trim()).filter(p => p)
        })
      }
    }

    return functions
  }

  private static extractVariables(lines: string[], promptLine: number): VariableContext[] {
    const variables: VariableContext[] = []
    
    // Look for variable declarations before the prompt
    for (let i = 0; i < promptLine && i < lines.length; i++) {
      const line = lines[i]
      
      // JavaScript/TypeScript const/let/var
      const jsVarMatch = line.match(/(?:const|let|var)\s+(\w+)(?:\s*:\s*(\w+))?\s*=\s*(.*)/)
      if (jsVarMatch) {
        variables.push({
          name: jsVarMatch[1],
          type: jsVarMatch[2] || undefined,
          value: jsVarMatch[3]?.trim(),
          isConstant: line.includes('const')
        })
      }

      // Python variables
      const pyVarMatch = line.match(/^(\w+)\s*=\s*(.*)/)
      if (pyVarMatch && !pyVarMatch[1].includes('def')) {
        variables.push({
          name: pyVarMatch[1],
          value: pyVarMatch[2]?.trim(),
          isConstant: pyVarMatch[1].toUpperCase() === pyVarMatch[1] // Convention: uppercase = constant
        })
      }
    }

    return variables
  }

  private static findPromptUsage(
    prompt: ExtractedPrompt, 
    lines: string[], 
    configFile: ConfigFile
  ): UsageContext[] {
    const usage: UsageContext[] = []
    const promptSnippet = prompt.content.substring(0, 50) // First 50 chars as identifier

    lines.forEach((line, index) => {
      if (index !== prompt.lineNumber - 1 && line.includes(promptSnippet)) {
        usage.push({
          location: configFile.name,
          lineNumber: index + 1,
          context: line.trim()
        })
      }
    })

    return usage
  }

  /**
   * Generate a context summary for the optimization engine
   */
  static generateContextSummary(contexts: CodeContext[]): string {
    if (contexts.length === 0) return ''

    const summaries = contexts.map(ctx => {
      const functionNames = ctx.relatedFunctions.map(f => f.name).join(', ')
      const variableNames = ctx.variables.map(v => v.name).join(', ')
      const importCount = ctx.imports.length

      return `
Prompt: "${ctx.prompt.content.substring(0, 50)}..."
- Type: ${ctx.prompt.type}
- Located at line ${ctx.prompt.lineNumber}
- Nearby functions: ${functionNames || 'none'}
- Variables in scope: ${variableNames || 'none'}
- Import count: ${importCount}
- Usage locations: ${ctx.usage.length} found`
    })

    return `Code Context Analysis:\n${summaries.join('\n\n')}`
  }

  /**
   * Extract specific patterns that might affect prompt optimization
   */
  static extractOptimizationHints(contexts: CodeContext[]): string[] {
    const hints: string[] = []

    for (const ctx of contexts) {
      // Check if prompt is used in a loop
      const inLoop = ctx.surroundingCode.before.some(line => 
        line.includes('for') || line.includes('while') || line.includes('.map')
      )
      if (inLoop) {
        hints.push('Prompt is used in a loop - consider performance optimizations')
      }

      // Check if prompt uses variables
      const usesVariables = ctx.variables.some(v => 
        ctx.prompt.content.includes(`{${v.name}}`) || 
        ctx.prompt.content.includes(`\${${v.name}}`)
      )
      if (usesVariables) {
        hints.push('Prompt uses template variables - ensure clear variable descriptions')
      }

      // Check if it's an API-related prompt
      const isAPIRelated = ctx.imports.some(imp => 
        imp.includes('openai') || imp.includes('anthropic') || imp.includes('api')
      )
      if (isAPIRelated) {
        hints.push('Prompt is used with AI APIs - consider token optimization')
      }

      // Check for specific function patterns
      if (ctx.relatedFunctions.some(f => f.name.includes('parse') || f.name.includes('extract'))) {
        hints.push('Prompt output is parsed - ensure structured output format')
      }

      if (ctx.relatedFunctions.some(f => f.name.includes('validate') || f.name.includes('check'))) {
        hints.push('Prompt output is validated - add validation constraints to prompt')
      }
    }

    return [...new Set(hints)] // Remove duplicates
  }
} 