'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GitBranch, CheckCircle, ExternalLink, RefreshCw, FileText, Folder, Github } from 'lucide-react'
import { ConfigFile } from '@/types'

interface GitHubStatus {
  connected: boolean
  repository?: {
    name: string
    full_name: string
    description: string
    html_url: string
    default_branch: string
    private: boolean
  }
  owner?: string
  hasApiKey: boolean
  error?: string
}

interface GitHubFile {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  download_url?: string
  html_url: string
}

interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

interface GitHubConnectionProps {
  onFileSelect?: (file: ConfigFile) => void
}

export function GitHubConnection({ onFileSelect }: GitHubConnectionProps) {
  const { data: session, status: sessionStatus } = useSession()
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [files, setFiles] = useState<GitHubFile[]>([])
  const [branches, setBranches] = useState<GitHubBranch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [currentPath, setCurrentPath] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/github-status')
      const result = await response.json()
      setStatus(result.data)
      
      // Set default branch if connected
      if (result.data?.connected && result.data?.repository?.default_branch) {
        setSelectedBranch(result.data.repository.default_branch)
      }
    } catch (error) {
      console.error('Failed to fetch GitHub status:', error)
      setStatus({ connected: false, hasApiKey: false, error: 'Connection failed' })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBranches = async () => {
    if (!status?.connected) return
    
    setIsLoadingBranches(true)
    try {
      const response = await fetch('/api/github-branches')
      const result = await response.json()
      if (result.success) {
        setBranches(result.data.branches)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      setIsLoadingBranches(false)
    }
  }

  const fetchFiles = async (path: string = '') => {
    if (!status?.connected || !selectedBranch) return
    
    setIsLoadingFiles(true)
    try {
      const response = await fetch(`/api/github-files?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(selectedBranch)}`)
      const result = await response.json()
      if (result.success) {
        setFiles(result.data.files)
        setCurrentPath(path)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleFileClick = async (file: GitHubFile) => {
    if (file.type === 'dir') {
      await fetchFiles(file.path)
    } else if (file.download_url && onFileSelect) {
      try {
        const response = await fetch(file.download_url)
        const content = await response.text()
        
        const configFile: ConfigFile = {
          name: file.name,
          type: getFileType(file.name),
          content,
          size: file.size || content.length
        }
        
        // Extract prompts from code files
        if (['python', 'javascript', 'typescript', 'markdown'].includes(configFile.type)) {
          const { PromptExtractor } = await import('@/lib/prompt-extractor')
          configFile.extractedPrompts = PromptExtractor.extractPrompts(configFile)
        }
        
        onFileSelect(configFile)
      } catch (error) {
        console.error('Failed to load file:', error)
      }
    }
  }

  const getFileType = (filename: string): 'yaml' | 'json' | 'typescript' | 'python' | 'javascript' | 'markdown' => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'yaml':
      case 'yml':
        return 'yaml'
      case 'json':
        return 'json'
      case 'ts':
      case 'tsx':
        return 'typescript'
      case 'py':
        return 'python'
      case 'js':
      case 'jsx':
        return 'javascript'
      case 'md':
      case 'txt':
        return 'markdown'
      default:
        return 'json'
    }
  }

  const navigateBack = () => {
    const pathParts = currentPath.split('/').filter(Boolean)
    pathParts.pop()
    const newPath = pathParts.join('/')
    fetchFiles(newPath)
  }

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch)
    setCurrentPath('')
    setFiles([])
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (status?.connected) {
      fetchBranches()
    }
  }, [status?.connected])

  useEffect(() => {
    if (status?.connected && selectedBranch) {
      fetchFiles()
    }
  }, [status?.connected, selectedBranch])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Checking GitHub connection...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <CardTitle>GitHub Integration</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Connect to your repository for automated prompt optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {session ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Connected as {session.user?.name}</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => signOut()}
                  >
                    Disconnect
                  </Button>
                </div>
                
                {status.repository && (
                  <div className=" p-4 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-black">
                      <h4 className="font-medium">{status.repository.full_name}</h4>
                      <a 
                        href={status.repository.html_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4 text-black" />
                        <span className="text-sm text-black">View on GitHub</span>
                      </a>
                    </div>
                    {status.repository.description && (
                      <p className="text-sm text-black">
                        {status.repository.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-">
                      <div className="flex items-center gap-2 bg-white rounded-lg p-2">
                        <span>Branch:</span>
                        <Select 
                          value={selectedBranch} 
                          onValueChange={handleBranchChange}
                          disabled={isLoadingBranches}
                        >
                          <SelectTrigger className="w-40 h-7 text-sm">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent className='bg-white'>
                            {branches.map((branch) => (
                              <SelectItem key={branch.name} value={branch.name}>
                                <div className="flex items-center gap-2">
                                  <span>{branch.name}</span>
                                  {branch.name === status.repository?.default_branch && (
                                    <Badge variant="secondary" className="text-xs">default</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isLoadingBranches && (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        )}
                      </div>
                      <span>{status.repository.private ? 'Private' : 'Public'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5 text-white" />
                  <span className="font-medium">Connect to GitHub</span>
                  <Badge variant="outline">Not Connected</Badge>
                </div>
                
                <div className=" border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm text-black  mb-3">
                    Connect your GitHub account to access your repositories and enable automated prompt optimization.
                  </p>
                  <Button 
                    onClick={() => signIn('github')}
                    className="w-full"
                    disabled={sessionStatus === 'loading'}
                  >
                    <Github className="h-4 w-4 mr-2" />
                    {sessionStatus === 'loading' ? 'Connecting...' : 'Connect with GitHub'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Browser */}
      {session && status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Repository Files</CardTitle>
            <CardDescription>
              Browse and select prompt configuration files from your repository
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Navigation */}
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchFiles('')}
                disabled={!currentPath}
              >
                Root
              </Button>
              {currentPath && (
                <>
                  <span>/</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={navigateBack}
                  >
                    Back
                  </Button>
                  <span>/</span>
                  <span className="text-sm text-gray-600">{currentPath}</span>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchFiles(currentPath)}
                disabled={isLoadingFiles}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* File List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2">Loading files...</span>
                </div>
              ) : files.length > 0 ? (
                files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    {file.type === 'dir' ? (
                      <Folder className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      {file.size && (
                        <div className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>
                    {file.type === 'file' && onFileSelect && (
                      <Badge variant="outline" className="text-xs">
                        Load
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No prompt configuration files found in this directory</p>
                  <p className="text-sm mt-1">Looking for .yaml, .json, .ts, and .md files</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}