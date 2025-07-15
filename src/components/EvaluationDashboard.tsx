'use client'

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  Clock,
  Target,
  BarChart3,
  Info,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface ObjectiveMetrics {
  jsonParseSuccess: {
    original: number;
    optimized: number;
    samples: number;
    confidenceInterval: [number, number];
  };
  structureCompliance: {
    original: number;
    optimized: number;
    samples: number;
    confidenceInterval: [number, number];
  };
  errorRate: {
    original: number;
    optimized: number;
    samples: number;
    confidenceInterval: [number, number];
  };
  responseTime: {
    original: number;
    optimized: number;
    samples: number;
    confidenceInterval: [number, number];
  };
  hallucinationRate: {
    original: number;
    optimized: number;
    samples: number;
    confidenceInterval: [number, number];
  };
}

export interface BenchmarkResults {
  name: string;
  category: string;
  originalScore: number;
  optimizedScore: number;
  samples: number;
  confidenceInterval: [number, number];
  examples: {
    question: string;
    originalAnswer: string;
    optimizedAnswer: string;
    correctAnswer: string;
    originalCorrect: boolean;
    optimizedCorrect: boolean;
    explanation: string;
  }[];
}

export interface PairwiseComparison {
  category: string;
  originalWins: number;
  optimizedWins: number;
  ties: number;
  totalComparisons: number;
  confidenceInterval: [number, number];
  humanAnnotatorAgreement: number;
}

export interface EvaluationData {
  objectiveMetrics: ObjectiveMetrics;
  benchmarkResults: BenchmarkResults[];
  pairwiseComparisons: PairwiseComparison[];
  overallAssessment: {
    significantImprovements: string[];
    significantRegressions: string[];
    neutrantChanges: string[];
    recommendations: string[];
  };
  evidence: {
    [key: string]: {
      description: string;
      samples: any[];
      calculation: string;
    };
  };
}

interface EvaluationDashboardProps {
  data: EvaluationData;
  onViewDetails: (metric: string) => void;
}

export function EvaluationDashboard({ data, onViewDetails }: EvaluationDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<string[]>(['objective']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const formatConfidenceInterval = (interval: [number, number]) => {
    return `${interval[0].toFixed(2)}-${interval[1].toFixed(2)}`;
  };

  const getChangeDirection = (original: number, optimized: number, lowerIsBetter = false) => {
    const improved = lowerIsBetter ? optimized < original : optimized > original;
    const change = optimized - original;
    const percentChange = ((change / original) * 100);
    
    return {
      improved,
      change,
      percentChange: Math.abs(percentChange),
      direction: change > 0 ? 'up' : 'down'
    };
  };

  const MetricCard = ({ 
    title, 
    original, 
    optimized, 
    samples, 
    confidenceInterval, 
    unit = '%',
    lowerIsBetter = false,
    description 
  }: {
    title: string;
    original: number;
    optimized: number;
    samples: number;
    confidenceInterval: [number, number];
    unit?: string;
    lowerIsBetter?: boolean;
    description: string;
  }) => {
    const change = getChangeDirection(original, optimized, lowerIsBetter);
    
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-sm">{title}</h4>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(title)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Evidence
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Original</p>
              <p className="text-lg font-semibold">{original.toFixed(2)}{unit}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Optimized</p>
              <p className="text-lg font-semibold">{optimized.toFixed(2)}{unit}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {change.improved ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${change.improved ? 'text-green-600' : 'text-red-600'}`}>
                {change.percentChange.toFixed(1)}% {change.improved ? 'improvement' : 'regression'}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              95% CI: {formatConfidenceInterval(confidenceInterval)}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Based on {samples} samples
          </div>
        </div>
      </Card>
    );
  };

  const BenchmarkCard = ({ benchmark }: { benchmark: BenchmarkResults }) => {
    const change = getChangeDirection(benchmark.originalScore, benchmark.optimizedScore);
    
    return (
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{benchmark.name}</h4>
              <p className="text-sm text-muted-foreground">{benchmark.category}</p>
            </div>
            <Badge variant={change.improved ? "default" : "destructive"}>
              {change.improved ? 'Improved' : 'Regressed'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Original Score</p>
              <p className="text-lg font-semibold">{benchmark.originalScore.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Optimized Score</p>
              <p className="text-lg font-semibold">{benchmark.optimizedScore.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {change.improved ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${change.improved ? 'text-green-600' : 'text-red-600'}`}>
                {change.percentChange.toFixed(1)}% change
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              95% CI: {formatConfidenceInterval(benchmark.confidenceInterval)}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {benchmark.samples} samples • {benchmark.examples.length} examples available
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold flex items-center">
          <BarChart3 className="h-6 w-6 mr-2" />
          Evaluation Results
        </h3>
        <p className="text-muted-foreground">
          Comprehensive analysis based on objective metrics and standardized benchmarks
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="objective">Objective Metrics</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="pairwise">Human Preference</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overall Assessment */}
          <Card className="p-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Overall Assessment
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <Label className="text-sm font-medium">Significant Improvements</Label>
                  </div>
                  <ul className="text-sm space-y-1">
                    {data.overallAssessment.significantImprovements.map((improvement, idx) => (
                      <li key={idx} className="text-green-800 ">• {improvement}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <Label className="text-sm font-medium">Significant Regressions</Label>
                  </div>
                  <ul className="text-sm space-y-1">
                    {data.overallAssessment.significantRegressions.map((regression, idx) => (
                      <li key={idx} className="text-red-800">• {regression}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <Label className="text-sm font-medium">Neutral Changes</Label>
                  </div>
                  <ul className="text-sm space-y-1">
                    {data.overallAssessment.neutrantChanges.map((change, idx) => (
                      <li key={idx} className="text-muted-foreground">• {change}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          <Card className="p-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {data.overallAssessment.recommendations.map((recommendation, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="objective" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              title="JSON Parse Success Rate"
              original={data.objectiveMetrics.jsonParseSuccess.original}
              optimized={data.objectiveMetrics.jsonParseSuccess.optimized}
              samples={data.objectiveMetrics.jsonParseSuccess.samples}
              confidenceInterval={data.objectiveMetrics.jsonParseSuccess.confidenceInterval}
              description="Percentage of responses that produce valid JSON"
            />
            
            <MetricCard
              title="Structure Compliance"
              original={data.objectiveMetrics.structureCompliance.original}
              optimized={data.objectiveMetrics.structureCompliance.optimized}
              samples={data.objectiveMetrics.structureCompliance.samples}
              confidenceInterval={data.objectiveMetrics.structureCompliance.confidenceInterval}
              description="Percentage of responses matching expected structure"
            />
            
            <MetricCard
              title="Error Rate"
              original={data.objectiveMetrics.errorRate.original}
              optimized={data.objectiveMetrics.errorRate.optimized}
              samples={data.objectiveMetrics.errorRate.samples}
              confidenceInterval={data.objectiveMetrics.errorRate.confidenceInterval}
              lowerIsBetter={true}
              description="Percentage of responses containing errors"
            />
            
            <MetricCard
              title="Response Time"
              original={data.objectiveMetrics.responseTime.original}
              optimized={data.objectiveMetrics.responseTime.optimized}
              samples={data.objectiveMetrics.responseTime.samples}
              confidenceInterval={data.objectiveMetrics.responseTime.confidenceInterval}
              unit="ms"
              lowerIsBetter={true}
              description="Average response time in milliseconds"
            />
            
            <MetricCard
              title="Hallucination Rate"
              original={data.objectiveMetrics.hallucinationRate.original}
              optimized={data.objectiveMetrics.hallucinationRate.optimized}
              samples={data.objectiveMetrics.hallucinationRate.samples}
              confidenceInterval={data.objectiveMetrics.hallucinationRate.confidenceInterval}
              lowerIsBetter={true}
              description="Percentage of responses with fabricated information"
            />
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.benchmarkResults.map((benchmark, idx) => (
              <BenchmarkCard key={idx} benchmark={benchmark} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pairwise" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {data.pairwiseComparisons.map((comparison, idx) => (
              <Card key={idx} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{comparison.category}</h4>
                      <p className="text-sm text-muted-foreground">
                        Human preference evaluation
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {comparison.humanAnnotatorAgreement.toFixed(1)}% agreement
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{comparison.optimizedWins}</p>
                      <p className="text-xs text-muted-foreground">Optimized Wins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">{comparison.ties}</p>
                      <p className="text-xs text-muted-foreground">Ties</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{comparison.originalWins}</p>
                      <p className="text-xs text-muted-foreground">Original Wins</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <strong>Preference:</strong> {comparison.optimizedWins > comparison.originalWins ? 'Optimized' : 'Original'}
                      {' '}({(Math.max(comparison.optimizedWins, comparison.originalWins) / comparison.totalComparisons * 100).toFixed(1)}%)
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      95% CI: {formatConfidenceInterval(comparison.confidenceInterval)}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {comparison.totalComparisons} pairwise comparisons
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 