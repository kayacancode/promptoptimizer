'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Info,
  Eye,
  Users,
  Lock,
  AlertCircle,
  FileX,
  Scale
} from 'lucide-react'

interface SafetyEvaluationProps {
  evaluation: {
    overall_score: number
    toxicity_score: number
    bias_score: number
    privacy_score: number
    harmful_content_score: number
    misinformation_score: number
    compliance_score: number
    details: {
      flags: Array<{
        type: string
        severity: 'low' | 'medium' | 'high' | 'critical'
        description: string
        location: string
        suggestion: string
      }>
      recommendations: string[]
      risk_level: 'low' | 'medium' | 'high' | 'critical'
    }
  }
}

export function SafetyEvaluation({ evaluation }: SafetyEvaluationProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle2 className="h-4 w-4" />
      case 'medium': return <Info className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'critical': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getSafetyIcon = (type: string) => {
    switch (type) {
      case 'toxicity': return <AlertTriangle className="h-4 w-4" />
      case 'bias': return <Users className="h-4 w-4" />
      case 'privacy': return <Lock className="h-4 w-4" />
      case 'harmful_content': return <XCircle className="h-4 w-4" />
      case 'misinformation': return <FileX className="h-4 w-4" />
      case 'compliance': return <Scale className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  const formatScore = (score: number) => (score * 100).toFixed(1)

  const safetyCategories = [
    { name: 'Toxicity', score: evaluation.toxicity_score, key: 'toxicity' },
    { name: 'Bias', score: evaluation.bias_score, key: 'bias' },
    { name: 'Privacy', score: evaluation.privacy_score, key: 'privacy' },
    { name: 'Harmful Content', score: evaluation.harmful_content_score, key: 'harmful_content' },
    { name: 'Misinformation', score: evaluation.misinformation_score, key: 'misinformation' },
    { name: 'Compliance', score: evaluation.compliance_score, key: 'compliance' }
  ]

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Safety Evaluation</CardTitle>
            <Badge variant="outline" className={`${getRiskColor(evaluation.details.risk_level)} border`}>
              <div className="flex items-center space-x-1">
                {getRiskIcon(evaluation.details.risk_level)}
                <span className="capitalize">{evaluation.details.risk_level} Risk</span>
              </div>
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatScore(evaluation.overall_score)}%
            </div>
            <div className="text-xs text-muted-foreground">Overall Safety</div>
          </div>
        </div>
        <CardDescription>
          Comprehensive safety analysis including bias, toxicity, privacy, and compliance evaluation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Risk Alert */}
        {evaluation.details.risk_level !== 'low' && (
          <Alert className={`border ${getRiskColor(evaluation.details.risk_level)}`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{evaluation.details.risk_level.charAt(0).toUpperCase() + evaluation.details.risk_level.slice(1)} Risk Detected:</strong> 
              {evaluation.details.risk_level === 'critical' 
                ? ' Immediate review required before deployment.'
                : evaluation.details.risk_level === 'high' 
                ? ' Significant safety improvements recommended.'
                : ' Some safety considerations identified.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Safety Category Scores */}
        <div className="space-y-3">
          <h4 className="font-medium">Safety Categories</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {safetyCategories.map((category) => (
              <div key={category.key} className="p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {getSafetyIcon(category.key)}
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">
                    {formatScore(category.score)}%
                  </div>
                  <Badge variant={category.score >= 0.8 ? 'default' : category.score >= 0.6 ? 'secondary' : 'destructive'}>
                    {category.score >= 0.8 ? 'Good' : category.score >= 0.6 ? 'Fair' : 'Risk'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Flags */}
        {evaluation.details.flags.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Safety Flags</h4>
            <div className="space-y-2">
              {evaluation.details.flags.map((flag, index) => (
                <Alert key={index} className={`border ${getRiskColor(flag.severity)}`}>
                  <div className="flex items-start space-x-2">
                    {getRiskIcon(flag.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium capitalize">{flag.type.replace('_', ' ')}</span>
                        <Badge variant="outline" className={getRiskColor(flag.severity)}>
                          {flag.severity}
                        </Badge>
                      </div>
                      <AlertDescription className="text-sm">
                        <div className="mb-1">{flag.description}</div>
                        <div className="text-xs text-muted-foreground">
                          <strong>Suggestion:</strong> {flag.suggestion}
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {evaluation.details.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Recommendations</h4>
            <div className="space-y-2">
              {evaluation.details.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-primary/5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Compliance Framework Evaluation</span>
            <Badge variant={evaluation.compliance_score >= 0.8 ? 'default' : 'destructive'}>
              {evaluation.compliance_score >= 0.8 ? 'Compliant' : 'Review Required'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}