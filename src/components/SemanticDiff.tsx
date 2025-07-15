'use client'

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Info, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  MessageSquare, 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  Lightbulb,
  Eye,
  Copy
} from 'lucide-react';

export interface SemanticChange {
  type: 'structure' | 'clarity' | 'specificity' | 'tone' | 'format' | 'safety' | 'efficiency';
  impact: 'high' | 'medium' | 'low';
  description: string;
  reasoning: string;
  examples?: {
    before: string;
    after: string;
    explanation: string;
  }[];
  expectedOutcome: string;
  confidence: number;
  section: {
    start: number;
    end: number;
    context: string;
  };
}

export interface SemanticDiffData {
  originalText: string;
  optimizedText: string;
  changes: SemanticChange[];
  overallImpact: {
    structureImprovements: number;
    clarityImprovements: number;
    specificityImprovements: number;
    potentialRisks: string[];
  };
  summary: {
    keyChanges: string[];
    expectedBehaviorChanges: string[];
    recommendations: string[];
  };
}

interface SemanticDiffProps {
  data: SemanticDiffData;
  onCopyOptimized: () => void;
}

export function SemanticDiff({ data, onCopyOptimized }: SemanticDiffProps) {
  const [selectedTab, setSelectedTab] = useState('changes');
  const [expandedChanges, setExpandedChanges] = useState<number[]>([]);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  const toggleChange = (index: number) => {
    setExpandedChanges(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getChangeIcon = (type: SemanticChange['type']) => {
    switch (type) {
      case 'structure': return <FileText className="h-4 w-4" />;
      case 'clarity': return <Eye className="h-4 w-4" />;
      case 'specificity': return <Target className="h-4 w-4" />;
      case 'tone': return <MessageSquare className="h-4 w-4" />;
      case 'format': return <FileText className="h-4 w-4" />;
      case 'safety': return <AlertTriangle className="h-4 w-4" />;
      case 'efficiency': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getChangeColor = (type: SemanticChange['type']) => {
    switch (type) {
      case 'structure': return 'text-blue-600';
      case 'clarity': return 'text-green-600';
      case 'specificity': return 'text-purple-600';
      case 'tone': return 'text-orange-600';
      case 'format': return 'text-indigo-600';
      case 'safety': return 'text-red-600';
      case 'efficiency': return 'text-emerald-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactBadge = (impact: SemanticChange['impact']) => {
    switch (impact) {
      case 'high': return <Badge className= "text-red-500" variant="destructive">High Impact</Badge>;
      case 'medium': return <Badge variant="default">Medium Impact</Badge>;
      case 'low': return <Badge variant="secondary">Low Impact</Badge>;
    }
  };

  const renderTextWithHighlights = (text: string, changes: SemanticChange[]) => {
    const lines = text.split('\n');
    const result = [];
    
    let currentLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentLine++;
      
      // Find changes that affect this line
      const lineChanges = changes.filter(change => 
        currentLine >= change.section.start && currentLine <= change.section.end
      );
      
      result.push(
        <div key={i} className="flex">
          {showLineNumbers && (
            <div className="w-12 text-xs text-muted-foreground text-right pr-3 border-r mr-3 py-1">
              {currentLine}
            </div>
          )}
          <div className="flex-1 py-1">
            {lineChanges.length > 0 ? (
              <div className="relative">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 pl-2 rounded-r">
                  <span className="font-mono text-sm">{line}</span>
                  <div className="absolute right-0 top-0 -mr-1 -mt-1">
                    {lineChanges.map((change, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full ${getChangeColor(change.type).replace('text-', 'bg-')} mr-1`} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <span className="font-mono text-sm">{line}</span>
            )}
          </div>
        </div>
      );
    }
    
    return result;
  };

  const ChangeCard = ({ change, index }: { change: SemanticChange; index: number }) => {
    const isExpanded = expandedChanges.includes(index);
    
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${getChangeColor(change.type)}`}>
                {getChangeIcon(change.type)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium capitalize">{change.type} Change</h4>
                  {getImpactBadge(change.impact)}
                </div>
                <p className="text-sm text-muted-foreground">{change.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {change.confidence}% confidence
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleChange(index)}
                className="p-1"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {isExpanded && (
            <div className="space-y-4 pl-13">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Why this change matters:</p>
                    <p className="text-sm text-blue-800  mt-1">{change.reasoning}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Target className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900 ">Expected outcome:</p>
                    <p className="text-sm text-green-700  mt-1">{change.expectedOutcome}</p>
                  </div>
                </div>
              </div>
              
              {change.examples && change.examples.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Examples:</p>
                  {change.examples.map((example, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Before</Label>
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm font-mono">
                            {example.before}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">After</Label>
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm font-mono">
                            {example.after}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground italic">
                        {example.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                <strong>Context:</strong> {change.section.context} (lines {change.section.start}-{change.section.end})
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Semantic Changes Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Understanding why each change improves your prompt
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
          >
            {showLineNumbers ? 'Hide' : 'Show'} Line Numbers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyOptimized}
            className="flex items-center space-x-2"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Optimized</span>
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="changes">Changes ({data.changes.length})</TabsTrigger>
          <TabsTrigger value="comparison">Side-by-Side</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {data.changes.map((change, index) => (
              <ChangeCard key={index} change={change} index={index} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Original</Label>
                <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-900/10 max-h-96 overflow-y-auto">
                  {renderTextWithHighlights(data.originalText, [])}
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Optimized</Label>
                <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-900/10 max-h-96 overflow-y-auto">
                  {renderTextWithHighlights(data.optimizedText, data.changes)}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  Key Changes
                </h4>
                <ul className="space-y-2">
                  {data.summary.keyChanges.map((change, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="p-4">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <Target className="h-5 w-5 text-blue-500 mr-2" />
                  Expected Behavior Changes
                </h4>
                <ul className="space-y-2">
                  {data.summary.expectedBehaviorChanges.map((change, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {data.summary.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-4">
              <h4 className="font-medium">Overall Impact Assessment</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.overallImpact.structureImprovements}</div>
                  <div className="text-sm text-muted-foreground">Structure Improvements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.overallImpact.clarityImprovements}</div>
                  <div className="text-sm text-muted-foreground">Clarity Improvements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{data.overallImpact.specificityImprovements}</div>
                  <div className="text-sm text-muted-foreground">Specificity Improvements</div>
                </div>
              </div>
              
              {data.overallImpact.potentialRisks.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Potential Risks</span>
                  </div>
                  <ul className="space-y-1">
                    {data.overallImpact.potentialRisks.map((risk, idx) => (
                      <li key={idx} className="text-sm text-orange-700 dark:text-orange-300">
                        • {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 