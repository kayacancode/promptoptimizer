'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Target, Users, BookOpen, TrendingUp } from 'lucide-react'

interface ProjectContext {
  domain: string
  useCase: string
  targetAudience: string
  keyTopics: string[]
  complexity: 'beginner' | 'intermediate' | 'expert'
}

interface ProjectContextDisplayProps {
  context: ProjectContext
  testCasesGenerated: number
  lmsysExamplesUsed: number
}

export function ProjectContextDisplay({ 
  context, 
  testCasesGenerated, 
  lmsysExamplesUsed 
}: ProjectContextDisplayProps) {
  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'coding': return <Brain className="h-4 w-4 text-blue-600" />
      case 'education': return <BookOpen className="h-4 w-4 text-green-600" />
      case 'customer_service': return <Users className="h-4 w-4 text-purple-600" />
      default: return <Target className="h-4 w-4 text-gray-600" />
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'expert': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <CardTitle>Project Context Analysis</CardTitle>
        </div>
        <CardDescription>
          AI-detected context used to generate relevant test cases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {getDomainIcon(context.domain)}
              <span className="text-sm font-medium">Domain</span>
            </div>
            <Badge variant="outline" className="capitalize">
              {context.domain.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Use Case</div>
            <Badge variant="outline" className="capitalize">
              {context.useCase.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Target Audience</div>
            <Badge variant="outline" className="capitalize">
              {context.targetAudience.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Complexity Level</div>
            <Badge className={`capitalize ${getComplexityColor(context.complexity)}`}>
              {context.complexity}
            </Badge>
          </div>
        </div>

        {/* Key Topics */}
        {context.keyTopics.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Key Topics</div>
            <div className="flex flex-wrap gap-2">
              {context.keyTopics.map((topic, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Test Case Generation Summary */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">Test Case Generation</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{testCasesGenerated}</div>
              <div className="text-xs text-blue-600">Total Generated</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {testCasesGenerated - lmsysExamplesUsed}
              </div>
              <div className="text-xs text-green-600">Project-Specific</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{lmsysExamplesUsed}</div>
              <div className="text-xs text-purple-600">Real User Data</div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Context Benefits</div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Test cases relevant to {context.domain} domain</li>
            <li>• Appropriate complexity for {context.targetAudience}</li>
            <li>• Real-world examples from LMSYS-Chat-1M dataset</li>
            <li>• Evaluation criteria optimized for {context.useCase}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 