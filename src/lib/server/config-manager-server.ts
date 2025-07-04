// Server-side only config manager
import * as yaml from 'js-yaml'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ConfigFile, FileChange } from '@/types'

export class ServerConfigManager {
  private basePath: string

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath
  }

  async loadConfig(filePath: string): Promise<ConfigFile> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      const content = await fs.readFile(fullPath, 'utf8')
      const stats = await fs.stat(fullPath)
      
      const configFile: ConfigFile = {
        name: path.basename(filePath),
        type: this.detectConfigType(filePath),
        content,
        size: stats.size
      }

      // Validate the configuration
      await this.validateConfig(configFile)
      
      return configFile
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async saveConfig(configFile: ConfigFile, targetPath?: string): Promise<void> {
    try {
      const filePath = targetPath || `configs/${configFile.name}`
      const fullPath = path.join(this.basePath, filePath)
      
      // Ensure directory exists
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })
      
      // Validate before saving
      await this.validateConfig(configFile)
      
      await fs.writeFile(fullPath, configFile.content, 'utf8')
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private detectConfigType(filePath: string): 'yaml' | 'json' | 'typescript' {
    const ext = path.extname(filePath).toLowerCase()
    
    switch (ext) {
      case '.json':
        return 'json'
      case '.yaml':
      case '.yml':
        return 'yaml'
      case '.ts':
      case '.tsx':
        return 'typescript'
      default:
        return 'json'
    }
  }

  private async validateConfig(configFile: ConfigFile): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic validation
      if (!configFile.content || configFile.content.trim().length === 0) {
        errors.push('Configuration content is empty')
      }

      // Type-specific validation
      switch (configFile.type) {
        case 'json':
          await this.validateJSON(configFile.content)
          break
        case 'yaml':
          await this.validateYAML(configFile.content)
          break
        case 'typescript':
          // Basic TypeScript validation would go here
          break
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation failed')
      return { valid: false, errors, warnings }
    }
  }

  private async validateJSON(content: string): Promise<void> {
    try {
      JSON.parse(content)
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`)
    }
  }

  private async validateYAML(content: string): Promise<void> {
    try {
      yaml.load(content)
    } catch (error) {
      throw new Error(`Invalid YAML: ${error instanceof Error ? error.message : 'Parse error'}`)
    }
  }

  async discoverConfigs(directory: string = 'configs'): Promise<ConfigFile[]> {
    const configs: ConfigFile[] = []
    
    try {
      const fullPath = path.join(this.basePath, directory)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(directory, entry.name)
          const ext = path.extname(entry.name).toLowerCase()
          
          if (['.json', '.yaml', '.yml', '.ts', '.tsx'].includes(ext)) {
            try {
              const config = await this.loadConfig(filePath)
              configs.push(config)
            } catch (error) {
              console.warn(`Failed to load config ${filePath}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to discover configs in ${directory}:`, error)
    }

    return configs
  }
}