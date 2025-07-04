import { ConfigFile, ExtractedPrompt } from '@/types'

export class PromptExtractor {
  static extractPrompts(configFile: ConfigFile): ExtractedPrompt[] {
    const prompts: ExtractedPrompt[] = []
    const lines = configFile.content.split('\n')

    switch (configFile.type) {
      case 'python':
        return this.extractFromPython(lines)
      case 'javascript':
      case 'typescript':
        return this.extractFromJavaScript(lines)
      case 'markdown':
        return this.extractFromMarkdown(lines)
      default:
        return this.extractFromGeneral(lines)
    }
  }

  private static extractFromPython(lines: string[]): ExtractedPrompt[] {
    const prompts: ExtractedPrompt[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Multi-line string patterns
      if (line.includes('"""') || line.includes("'''")) {
        const prompt = this.extractMultilineString(lines, i, /"""|\'\'\'/g)
        if (prompt && this.isLikelyPrompt(prompt.content)) {
          prompts.push({
            id: `python-${i}`,
            content: prompt.content,
            context: `Python multiline string at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(prompt.content, line)
          })
        }
      }
      
      // Common Python prompt patterns
      const patterns = [
        /system_prompt\s*=\s*['"](.*?)['"]$/,
        /user_prompt\s*=\s*['"](.*?)['"]$/,
        /prompt\s*=\s*['"](.*?)['"]$/,
        /message\s*=\s*['"](.*?)['"]$/,
        /instruction\s*=\s*['"](.*?)['"]$/,
        /template\s*=\s*['"](.*?)['"]$/,
        /['"](You are .*?)['"]/,
        /['"](Act as .*?)['"]/,
        /['"](Given .*?)['"]/,
      ]

      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match && match[1] && match[1].length > 20) {
          prompts.push({
            id: `python-${i}`,
            content: match[1],
            context: `Python variable assignment at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(match[1], line)
          })
        }
      }
    }

    return prompts
  }

  private static extractFromJavaScript(lines: string[]): ExtractedPrompt[] {
    const prompts: ExtractedPrompt[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Template literals
      if (line.includes('`')) {
        const prompt = this.extractTemplateLiteral(lines, i)
        if (prompt && this.isLikelyPrompt(prompt.content)) {
          prompts.push({
            id: `js-${i}`,
            content: prompt.content,
            context: `JavaScript template literal at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(prompt.content, line)
          })
        }
      }
      
      // Common JavaScript prompt patterns
      const patterns = [
        /systemPrompt\s*[:=]\s*['"](.*?)['"]$/,
        /userPrompt\s*[:=]\s*['"](.*?)['"]$/,
        /prompt\s*[:=]\s*['"](.*?)['"]$/,
        /message\s*[:=]\s*['"](.*?)['"]$/,
        /instruction\s*[:=]\s*['"](.*?)['"]$/,
        /template\s*[:=]\s*['"](.*?)['"]$/,
        /['"](You are .*?)['"]/,
        /['"](Act as .*?)['"]/,
        /content\s*:\s*['"](.*?)['"]$/,
      ]

      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match && match[1] && match[1].length > 20) {
          prompts.push({
            id: `js-${i}`,
            content: match[1],
            context: `JavaScript assignment at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(match[1], line)
          })
        }
      }
    }

    return prompts
  }

  private static extractFromMarkdown(lines: string[]): ExtractedPrompt[] {
    const prompts: ExtractedPrompt[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Code blocks with prompts
      if (line.startsWith('```')) {
        const codeBlock = this.extractCodeBlock(lines, i)
        if (codeBlock && this.isLikelyPrompt(codeBlock.content)) {
          prompts.push({
            id: `md-${i}`,
            content: codeBlock.content,
            context: `Markdown code block at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(codeBlock.content, line)
          })
        }
      }
      
      // Blockquotes that look like prompts
      if (line.startsWith('>') && line.length > 20) {
        const blockquote = line.replace(/^>\s*/, '')
        if (this.isLikelyPrompt(blockquote)) {
          prompts.push({
            id: `md-${i}`,
            content: blockquote,
            context: `Markdown blockquote at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(blockquote, line)
          })
        }
      }
      
      // Headers that indicate prompts
      if (line.match(/^#+\s*(System|Prompt|Instruction|Template)/i)) {
        const nextLines = lines.slice(i + 1, i + 10).join('\\n')
        if (this.isLikelyPrompt(nextLines)) {
          prompts.push({
            id: `md-${i}`,
            content: nextLines,
            context: `Markdown section "${line}" at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(nextLines, line)
          })
        }
      }
    }

    return prompts
  }

  private static extractFromGeneral(lines: string[]): ExtractedPrompt[] {
    const prompts: ExtractedPrompt[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Look for quoted strings that look like prompts
      const quotedPatterns = [
        /['"](You are .*?)['"]/,
        /['"](Act as .*?)['"]/,
        /['"](Given .*?)['"]/,
        /['"](Please .*?)['"]/,
        /['"](Your task is .*?)['"]/,
        /['"](I want you to .*?)['"]/,
      ]

      for (const pattern of quotedPatterns) {
        const match = line.match(pattern)
        if (match && match[1] && match[1].length > 30) {
          prompts.push({
            id: `general-${i}`,
            content: match[1],
            context: `Quoted string at line ${i + 1}`,
            lineNumber: i + 1,
            type: this.classifyPromptType(match[1], line)
          })
        }
      }
    }

    return prompts
  }

  private static extractMultilineString(lines: string[], startIndex: number, delimiter: RegExp): { content: string; endIndex: number } | null {
    const startLine = lines[startIndex]
    const parts = startLine.split(delimiter)
    
    if (parts.length >= 3) {
      // Single line multiline string
      return { content: parts[1], endIndex: startIndex }
    }
    
    // Multi-line string
    let content = parts[1] || ''
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (delimiter.test(line)) {
        const endParts = line.split(delimiter)
        content += '\\n' + endParts[0]
        return { content: content.trim(), endIndex: i }
      }
      content += '\\n' + line
    }
    
    return null
  }

  private static extractTemplateLiteral(lines: string[], startIndex: number): { content: string; endIndex: number } | null {
    const startLine = lines[startIndex]
    const backticks = (startLine.match(/`/g) || []).length
    
    if (backticks >= 2) {
      // Single line template literal
      const match = startLine.match(/`([^`]*)`/)
      return match ? { content: match[1], endIndex: startIndex } : null
    }
    
    // Multi-line template literal
    let content = startLine.split('`')[1] || ''
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('`')) {
        const endParts = line.split('`')
        content += '\\n' + endParts[0]
        return { content: content.trim(), endIndex: i }
      }
      content += '\\n' + line
    }
    
    return null
  }

  private static extractCodeBlock(lines: string[], startIndex: number): { content: string; endIndex: number } | null {
    let content = ''
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('```')) {
        return { content: content.trim(), endIndex: i }
      }
      content += line + '\\n'
    }
    return null
  }

  private static isLikelyPrompt(text: string): boolean {
    const promptIndicators = [
      /you are/i,
      /act as/i,
      /your role/i,
      /your task/i,
      /please/i,
      /given/i,
      /instruction/i,
      /system/i,
      /assistant/i,
      /respond/i,
      /answer/i,
      /help/i,
      /generate/i,
      /create/i,
      /analyze/i,
      /explain/i,
      /describe/i,
      /summarize/i,
      /translate/i,
      /write/i,
      /provide/i,
    ]

    const hasPromptIndicators = promptIndicators.some(pattern => pattern.test(text))
    const isLongEnough = text.length > 20
    const hasNaturalLanguage = /[a-zA-Z]{3,}/.test(text)
    
    return hasPromptIndicators && isLongEnough && hasNaturalLanguage
  }

  private static classifyPromptType(content: string, context: string): 'system_prompt' | 'user_prompt' | 'template' | 'instruction' {
    const lowerContent = content.toLowerCase()
    const lowerContext = context.toLowerCase()
    
    if (lowerContent.includes('you are') || lowerContent.includes('your role') || lowerContext.includes('system')) {
      return 'system_prompt'
    }
    
    if (lowerContent.includes('please') || lowerContent.includes('i want') || lowerContext.includes('user')) {
      return 'user_prompt'
    }
    
    if (lowerContent.includes('{') || lowerContent.includes('{{') || lowerContext.includes('template')) {
      return 'template'
    }
    
    return 'instruction'
  }
}