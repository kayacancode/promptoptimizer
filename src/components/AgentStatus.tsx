'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bot, Clock, CheckCircle, AlertCircle, Activity, GitBranch } from 'lucide-react'

interface Agent {
  id: string
  name: string
  capabilities: string[]
}

interface Task {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  updatedAt: string
}

interface AgentStatusData {
  agents: Record<string, Agent>
  currentTask: Task | null
  taskQueue: Task[]
  timestamp: string
}

export function AgentStatus() {
  const [statusData, setStatusData] = useState<AgentStatusData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/agent-status')
      if (!response.ok) {
        throw new Error('Failed to fetch agent status')
      }
      const result = await response.json()
      if (result.success) {
        setStatusData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchStatus, 5000) // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Activity className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Loading agent status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-8 w-8" />
            <span className="ml-2">Error: {error}</span>
          </div>
          <Button onClick={fetchStatus} className="w-full mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!statusData) {
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Agent System Status
              </CardTitle>
              <CardDescription>
                Real-time monitoring of the autonomous optimization system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
              </Button>
              <Button variant="outline" size="sm" onClick={fetchStatus}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="current">Current Task</TabsTrigger>
              <TabsTrigger value="queue">Task Queue</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Active Agents
                        </p>
                        <p className="text-2xl font-bold">
                          {Object.keys(statusData.agents).length}
                        </p>
                      </div>
                      <Bot className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Current Task
                        </p>
                        <p className="text-2xl font-bold">
                          {statusData.currentTask ? '1' : '0'}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Queue Length
                        </p>
                        <p className="text-2xl font-bold">
                          {statusData.taskQueue.length}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="agents" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(statusData.agents).map(([id, agent]) => (
                  <Card key={id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription>ID: {agent.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Capabilities:</p>
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.map((capability) => (
                            <Badge key={capability} variant="secondary">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="current" className="space-y-4">
              {statusData.currentTask ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(statusData.currentTask.status)}
                        {statusData.currentTask.description}
                      </CardTitle>
                      <Badge className={getPriorityColor(statusData.currentTask.priority)}>
                        {statusData.currentTask.priority}
                      </Badge>
                    </div>
                    <CardDescription>
                      Task ID: {statusData.currentTask.id} | Type: {statusData.currentTask.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant="outline">{statusData.currentTask.status}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Created:</span>
                        <span>{new Date(statusData.currentTask.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Updated:</span>
                        <span>{new Date(statusData.currentTask.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No active task</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="queue" className="space-y-4">
              {statusData.taskQueue.length > 0 ? (
                <div className="space-y-3">
                  {statusData.taskQueue.map((task, index) => (
                    <Card key={task.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">#{index + 1}</span>
                              {getStatusIcon(task.status)}
                              <span className="font-medium">{task.description}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {task.type} | Created: {new Date(task.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Task queue is empty</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}