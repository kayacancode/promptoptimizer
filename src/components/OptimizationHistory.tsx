'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '../../utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  History, 
  Search, 
  Download, 
  Eye, 
  Calendar,
  TrendingUp,
  Brain,
  Zap,
  Trash2,
  FileText,
  Clock
} from 'lucide-react'
import { OptimizationSessionWithResults } from '@/lib/optimization-storage'

interface OptimizationHistoryProps {
  userId: string
}

export function OptimizationHistory({ userId }: OptimizationHistoryProps) {
  const [sessions, setSessions] = useState<OptimizationSessionWithResults[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<OptimizationSessionWithResults | null>(null)
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    averageImprovement: 0,
    totalOptimizations: 0
  })

  useEffect(() => {
    fetchSessions()
    fetchStats()
  }, [])

  const fetchSessions = async (search?: string) => {
    try {
      setLoading(true)
      const url = search 
        ? `/api/optimization-sessions?search=${encodeURIComponent(search)}`
        : '/api/optimization-sessions'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setSessions(data.data)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/optimization-sessions/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length > 2 || query.length === 0) {
      fetchSessions(query)
    }
  }

  const handleDownload = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/optimization-sessions/${sessionId}/download?format=txt`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `optimization-${sessionId}-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this optimization session?')) return
    
    try {
      const response = await fetch(`/api/optimization-sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId))
        setSelectedSession(null)
        fetchStats() // Refresh stats
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getModelNames = (settingsUsed: any) => {
    if (!settingsUsed?.modelConfigs) return []
    return settingsUsed.modelConfigs
      .filter((config: any) => config.enabled)
      .map((config: any) => config.name)
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <History className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-xl font-semibold">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-semibold">{stats.completedSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Improvement</p>
                <p className="text-xl font-semibold">
                  {stats.averageImprovement > 0 ? '+' : ''}{stats.averageImprovement.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Optimizations</p>
                <p className="text-xl font-semibold">{stats.totalOptimizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Optimization History
          </CardTitle>
          <CardDescription>
            View and manage your previous optimization sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search prompts, explanations, or requirements..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="detail">Detail View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No optimization sessions found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search query' : 'Start your first optimization to see history here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {session.session_name || 'Untitled Session'}
                              </h3>
                              <Badge variant={session.is_completed ? "default" : "secondary"}>
                                {session.is_completed ? 'Completed' : 'In Progress'}
                              </Badge>
                              {session.overall_improvement_percentage && (
                                <Badge variant="outline" className="text-green-600">
                                  +{session.overall_improvement_percentage.toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2 truncate">
                              {session.original_prompt.substring(0, 120)}...
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(session.created_at!)}
                              </span>
                              <span className="flex items-center">
                                <Brain className="w-3 h-3 mr-1" />
                                {getModelNames(session.settings_used).join(', ')}
                              </span>
                              {session.optimization_results && (
                                <span className="flex items-center">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {session.optimization_results.length} results
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSession(session)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(session.id!)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(session.id!)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="detail">
              {selectedSession ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedSession.session_name || 'Untitled Session'}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant={selectedSession.is_completed ? "default" : "secondary"}>
                          {selectedSession.is_completed ? 'Completed' : 'In Progress'}
                        </Badge>
                        {selectedSession.overall_improvement_percentage && (
                          <Badge variant="outline" className="text-green-600">
                            +{selectedSession.overall_improvement_percentage.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Created {formatDate(selectedSession.created_at!)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Original Prompt</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                          {selectedSession.original_prompt}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Optimized Prompt</h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                          {selectedSession.optimized_prompt}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Explanation</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-800">
                          {selectedSession.explanation}
                        </p>
                      </div>
                    </div>

                    {selectedSession.optimization_results && selectedSession.optimization_results.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Model Results</h4>
                        <div className="grid gap-4">
                          {selectedSession.optimization_results.map((result, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">{result.model_name}</h5>
                                {result.improvement_percentage && (
                                  <Badge variant="outline" className="text-green-600">
                                    +{result.improvement_percentage.toFixed(1)}%
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Hallucination Rate</p>
                                  <p className="font-semibold">
                                    {result.hallucination_rate ? `${(result.hallucination_rate * 100).toFixed(1)}%` : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Structure Score</p>
                                  <p className="font-semibold">
                                    {result.structure_score ? `${(result.structure_score * 100).toFixed(1)}%` : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Consistency Score</p>
                                  <p className="font-semibold">
                                    {result.consistency_score ? `${(result.consistency_score * 100).toFixed(1)}%` : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 pt-4 border-t">
                      <Button
                        onClick={() => handleDownload(selectedSession.id!)}
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Session
                      </Button>
                      <Button
                        onClick={() => setSelectedSession(null)}
                        variant="secondary"
                      >
                        Back to List
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a session to view details</h3>
                  <p className="text-gray-600">Click "View" on any session from the list to see full details</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}