'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EvaluationResult } from '@/types'

interface MetricsTooltipProps {
  result: EvaluationResult
}

export function MetricsTooltip({ result }: MetricsTooltipProps) {
  const calculateChange = (before: number, after: number) => {
    const change = ((after - before) / before) * 100
    return {
      value: change,
      formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      isPositive: change > 0
    }
  }

  const structureChange = calculateChange(result.beforeScore.structureCompliance, result.afterScore.structureCompliance)
  const hallucinationChange = calculateChange(result.beforeScore.hallucinationRate, result.afterScore.hallucinationRate)
  const qualityChange = calculateChange(result.beforeScore.responseQuality, result.afterScore.responseQuality)
  const overallChange = calculateChange(result.beforeScore.overall, result.afterScore.overall)

  // For hallucination rate, lower is better, so we invert the positive/negative indication
  const hallucinationDisplay = {
    ...hallucinationChange,
    isPositive: hallucinationChange.value < 0 // Lower hallucination rate is better
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted hover:bg-muted/80 transition-colors">
            <Info className="h-3 w-3 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium text-sm">Detailed Metrics</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span>Structure Compliance:</span>
                <span className={structureChange.isPositive ? 'text-green-500' : 'text-red-500'}>
                  {structureChange.formatted}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hallucination Rate:</span>
                <span className={hallucinationDisplay.isPositive ? 'text-green-500' : 'text-red-500'}>
                  {hallucinationChange.formatted}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Response Quality:</span>
                <span className={qualityChange.isPositive ? 'text-green-500' : 'text-red-500'}>
                  {qualityChange.formatted}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Overall Score:</span>
                <span className={overallChange.isPositive ? 'text-green-500' : 'text-red-500'}>
                  {overallChange.formatted}
                </span>
              </div>
              <div className="pt-1 border-t border-border">
                <div className="flex justify-between items-center">
                  <span>Test Cases:</span>
                  <span className="text-muted-foreground">
                    {result.metrics.passedTests}/{result.metrics.totalTests}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}